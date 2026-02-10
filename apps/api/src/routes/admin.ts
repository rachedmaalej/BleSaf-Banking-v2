import { Router } from 'express';
import {
  createTenantSchema,
  updateTenantSchema,
  createBranchSchema,
  updateBranchSchema,
  createBranchCompleteSchema,
  createCounterSchema,
  updateCounterSchema,
  counterConfigSchema,
  createServiceCategorySchema,
  updateServiceCategorySchema,
  resetServiceFieldSchema,
  createUserSchema,
  updateUserSchema,
  paginationSchema,
  operatingHoursSchema,
  tenantDefaultHoursSchema,
  USER_ROLE,
} from '@blesaf/shared';
import { adminService } from '../services/adminService';
import { templateService } from '../services/templateService';
import { auditService } from '../services/auditService';
import { analyticsService } from '../services/analyticsService';
import { scheduleService } from '../services/scheduleService';
import { batchImportService, type BatchBranchRow } from '../services/batchImportService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';
import { ForbiddenError } from '../lib/errors';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ============================================================
// TENANT MANAGEMENT (super_admin only)
// ============================================================

/**
 * GET /api/admin/tenants
 * List all tenants (super_admin only)
 */
router.get('/tenants', requireRole('super_admin'), async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await adminService.listTenants(pagination);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/tenants
 * Create a new tenant (super_admin only)
 */
router.post('/tenants', requireRole('super_admin'), async (req, res, next) => {
  try {
    const data = createTenantSchema.parse(req.body);
    const result = await adminService.createTenant(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/tenants/:tenantId
 * Get tenant details (super_admin only)
 */
router.get('/tenants/:tenantId', requireRole('super_admin'), async (req, res, next) => {
  try {
    const result = await adminService.getTenant(req.params.tenantId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/tenants/:tenantId
 * Update a tenant (super_admin only)
 */
router.patch('/tenants/:tenantId', requireRole('super_admin'), async (req, res, next) => {
  try {
    const data = updateTenantSchema.parse(req.body);
    const result = await adminService.updateTenant(req.params.tenantId, data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/tenant/default-hours
 * Update default operating hours for tenant (bank_admin only)
 */
router.patch('/tenant/default-hours', tenantMiddleware, requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = tenantDefaultHoursSchema.parse(req.body);

    await adminService.updateTenantDefaultHours(req.tenantId!, data);

    res.json({
      success: true,
      message: 'Default operating hours updated',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/tenant/default-hours
 * Get default operating hours for tenant (bank_admin only)
 */
router.get('/tenant/default-hours', tenantMiddleware, requireRole('bank_admin'), async (req, res, next) => {
  try {
    const tenant = await adminService.getTenantDefaultHours(req.tenantId!);

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// BRANCH MANAGEMENT (bank_admin+)
// ============================================================

// Apply tenant middleware for all branch-level routes
router.use('/branches', tenantMiddleware);

/**
 * POST /api/admin/branches/suggest-code
 * Generate a unique branch code based on name
 */
router.post('/branches/suggest-code', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Branch name is required (minimum 2 characters)',
      });
    }

    const code = await adminService.suggestBranchCode(req.tenantId!, name.trim());

    res.json({
      success: true,
      data: { suggestedCode: code },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/branches/check-code
 * Check if a branch code is available
 */
router.post('/branches/check-code', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Branch code is required',
      });
    }

    const available = await adminService.isBranchCodeAvailable(req.tenantId!, code.trim());

    res.json({
      success: true,
      data: { available, code: code.trim().toUpperCase() },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/branches
 * List branches for current tenant
 */
router.get('/branches', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await adminService.listBranches(req.tenantId!, pagination);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/branches
 * Create a new branch (bank_admin only)
 * @deprecated Use POST /api/admin/branches/complete instead for a complete branch setup
 */
router.post('/branches', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = createBranchSchema.parse(req.body);
    const result = await adminService.createBranch(req.tenantId!, data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/branches/complete
 * Create a complete branch with services and counters in one atomic operation.
 * This is the recommended way to create branches (via the wizard).
 */
router.post('/branches/complete', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = createBranchCompleteSchema.parse(req.body);
    const result = await adminService.createBranchComplete(req.tenantId!, data);

    res.status(201).json({
      success: true,
      data: result,
      message: `Branch created with ${result.services.length} services and ${result.counters.length} counters`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/branches/batch/template
 * Download CSV template for batch import
 */
router.get('/branches/batch/template', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const csv = batchImportService.generateCsvTemplate();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=branches_template.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/branches/batch/validate
 * Validate batch import data without creating branches
 */
router.post('/branches/batch/validate', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const { rows } = req.body as { rows: BatchBranchRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rows array is required',
      });
    }

    const result = await batchImportService.validateBatch(req.tenantId!, rows);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/branches/batch/import
 * Import validated branches
 */
router.post('/branches/batch/import', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const { rows, skipErrors = true } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rows array is required',
      });
    }

    // Re-validate before import to ensure data integrity
    const validation = await batchImportService.validateBatch(req.tenantId!, rows);

    if (validation.errors.length > 0 && !skipErrors) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: validation,
      });
    }

    const result = await batchImportService.importBatch(
      req.tenantId!,
      validation.valid,
      skipErrors
    );

    res.json({
      success: true,
      data: result,
      message: `${result.created} branches created${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/branches/:branchId/targets
 * Get daily target for a branch (defaults to today)
 * NOTE: This route must be defined BEFORE /branches/:branchId to avoid parameter matching issues
 */
router.get('/branches/:branchId/targets', requireRole('branch_manager', 'bank_admin'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date } = req.query;

    // Branch managers can only access their own branch
    if (req.user!.role === USER_ROLE.BRANCH_MANAGER && req.user!.branchId !== branchId) {
      throw new ForbiddenError('Cannot access targets for another branch');
    }

    const targetDate = date ? new Date(date as string) : new Date();
    const target = await analyticsService.getDailyTarget(branchId, targetDate);

    res.json({
      success: true,
      data: target,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/branches/:branchId/targets
 * Update daily target for a branch
 */
router.patch('/branches/:branchId/targets', requireRole('branch_manager', 'bank_admin'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date, servedTarget, avgWaitTarget, slaTarget, slaThreshold } = req.body;

    // Branch managers can only update their own branch
    if (req.user!.role === USER_ROLE.BRANCH_MANAGER && req.user!.branchId !== branchId) {
      throw new ForbiddenError('Cannot update targets for another branch');
    }

    const targetDate = date ? new Date(date) : new Date();
    const target = await analyticsService.updateDailyTarget(branchId, targetDate, {
      servedTarget,
      avgWaitTarget,
      slaTarget,
      slaThreshold,
    });

    res.json({
      success: true,
      data: target,
      message: 'Target updated',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/branches/:branchId/operating-hours
 * Get operating hours configuration for a branch
 */
router.get('/branches/:branchId/operating-hours', requireRole('branch_manager', 'bank_admin'), async (req, res, next) => {
  try {
    const { branchId } = req.params;

    // Branch managers can only view their own branch
    if (req.user!.role === USER_ROLE.BRANCH_MANAGER && req.user!.branchId !== branchId) {
      throw new ForbiddenError('Cannot view operating hours for another branch');
    }

    const result = await scheduleService.getOperatingHours(branchId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/branches/:branchId/operating-hours
 * Update operating hours configuration for a branch
 */
router.patch('/branches/:branchId/operating-hours', requireRole('branch_manager', 'bank_admin'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const data = operatingHoursSchema.parse(req.body);

    // Branch managers can only update their own branch
    if (req.user!.role === USER_ROLE.BRANCH_MANAGER && req.user!.branchId !== branchId) {
      throw new ForbiddenError('Cannot update operating hours for another branch');
    }

    await scheduleService.updateOperatingHours(branchId, data);
    const result = await scheduleService.getOperatingHours(branchId);

    res.json({
      success: true,
      data: result,
      message: 'Operating hours updated',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/branches/:branchId
 * Get branch details
 */
router.get('/branches/:branchId', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const result = await adminService.getBranch(req.params.branchId, req.tenantId!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/branches/:branchId
 * Update a branch (bank_admin only)
 */
router.patch('/branches/:branchId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = updateBranchSchema.parse(req.body);
    const result = await adminService.updateBranch(req.params.branchId, req.tenantId!, data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/branches/:branchId
 * Delete (deactivate) a branch (bank_admin only)
 */
router.delete('/branches/:branchId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    await adminService.deleteBranch(req.params.branchId, req.tenantId!);

    res.json({
      success: true,
      message: 'Branch deactivated',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/branches/:branchId/counters/config
 * Configure the number of counters for a branch
 * - branch_manager: can only configure their own branch
 * - bank_admin: can configure any branch in their tenant
 */
router.patch('/branches/:branchId/counters/config', requireRole('branch_manager', 'bank_admin'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const data = counterConfigSchema.parse(req.body);

    // Branch managers can only configure their own branch
    if (req.user!.role === USER_ROLE.BRANCH_MANAGER && req.user!.branchId !== branchId) {
      throw new ForbiddenError('Cannot configure counters for another branch');
    }

    const result = await adminService.configureCounterCount(
      branchId,
      data.targetCount,
      req.tenantId!,
      req.user!
    );

    res.json({
      success: true,
      data: result,
      message: result.created > 0
        ? `${result.created} counter(s) created`
        : result.deleted > 0
        ? `${result.deleted} counter(s) removed`
        : 'No changes made',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// COUNTER MANAGEMENT (branch_manager+)
// ============================================================

router.use('/counters', tenantMiddleware);

/**
 * GET /api/admin/counters
 * List counters (with optional branchId filter)
 */
router.get('/counters', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const result = await adminService.listCounters(
      req.tenantId!,
      branchId as string | undefined,
      req.user!
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/counters
 * Create a new counter
 */
router.post('/counters', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const data = createCounterSchema.parse(req.body);
    const result = await adminService.createCounter(req.tenantId!, data, req.user!);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/counters/:counterId
 * Update a counter
 */
router.patch('/counters/:counterId', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const data = updateCounterSchema.parse(req.body);
    const result = await adminService.updateCounter(
      req.params.counterId,
      req.tenantId!,
      data,
      req.user!
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/counters/:counterId
 * Delete a counter
 */
router.delete('/counters/:counterId', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    await adminService.deleteCounter(req.params.counterId, req.tenantId!, req.user!);

    res.json({
      success: true,
      message: 'Counter deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/counters/batch/open
 * Open all counters in a branch
 */
router.post('/counters/batch/open', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.body;
    const result = await adminService.batchUpdateCounterStatus(
      req.tenantId!,
      branchId,
      'open',
      req.user!
    );

    res.json({
      success: true,
      data: result,
      message: `${result.updated} counters opened`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/counters/batch/close
 * Close all counters in a branch
 */
router.post('/counters/batch/close', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.body;
    const result = await adminService.batchUpdateCounterStatus(
      req.tenantId!,
      branchId,
      'closed',
      req.user!
    );

    res.json({
      success: true,
      data: result,
      message: `${result.updated} counters closed`,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// SERVICE CATEGORY MANAGEMENT (bank_admin+)
// ============================================================

router.use('/services', tenantMiddleware);

/**
 * GET /api/admin/services
 * List service categories (with optional branchId filter)
 */
router.get('/services', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const result = await adminService.listServiceCategories(
      req.tenantId!,
      branchId as string | undefined,
      req.user!
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/services
 * Create a new service category
 */
router.post('/services', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = createServiceCategorySchema.parse(req.body);
    const result = await adminService.createServiceCategory(req.tenantId!, data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/services/:serviceId
 * Update a service category
 */
router.patch('/services/:serviceId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = updateServiceCategorySchema.parse(req.body);
    const result = await adminService.updateServiceCategory(req.params.serviceId, req.tenantId!, data, req.user?.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/services/:serviceId
 * Delete a service category
 */
router.delete('/services/:serviceId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const result = await adminService.deleteServiceCategory(req.params.serviceId, req.tenantId!);

    res.json({
      success: true,
      softDeleted: result.softDeleted,
      message: result.softDeleted
        ? 'Service deactivated (has ticket history)'
        : 'Service deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/services/:serviceId/history
 * Get change history for a service
 */
router.get('/services/:serviceId/history', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await auditService.getHistory('service', req.params.serviceId, pagination.page, pagination.pageSize);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/services/:serviceId/reset-field
 * Reset an overridden field to template value
 */
router.post('/services/:serviceId/reset-field', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = resetServiceFieldSchema.parse(req.body);
    const result = await templateService.resetServiceField(
      req.params.serviceId,
      data.field,
      req.tenantId!,
      req.user!.userId
    );

    res.json({
      success: true,
      data: result,
      message: `Champ "${data.field}" reinitialise depuis le template`,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// USER MANAGEMENT (bank_admin+)
// ============================================================

router.use('/users', tenantMiddleware);

/**
 * GET /api/admin/users
 * List users for current tenant
 */
router.get('/users', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const { branchId, role } = req.query;

    const result = await adminService.listUsers(
      req.tenantId!,
      pagination,
      req.user!,
      branchId as string | undefined,
      role as string | undefined
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users
 * Create a new user (bank_admin only)
 */
router.post('/users', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const result = await adminService.createUser(req.tenantId!, data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:userId
 * Get user details
 */
router.get('/users/:userId', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const result = await adminService.getUser(req.params.userId, req.tenantId!, req.user!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:userId
 * Update a user
 * - bank_admin: can update any user
 * - branch_manager: can only update tellers in their own branch
 */
router.patch('/users/:userId', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);

    // Branch managers can only update tellers in their own branch
    if (req.user!.role === USER_ROLE.BRANCH_MANAGER) {
      const targetUser = await adminService.getUser(req.params.userId, req.tenantId!, req.user!);

      if (targetUser.role !== USER_ROLE.TELLER) {
        throw new ForbiddenError('Branch managers can only manage teller accounts');
      }
      if (targetUser.branchId !== req.user!.branchId) {
        throw new ForbiddenError('Cannot manage user in another branch');
      }
      // Prevent role changes
      if (data.role && data.role !== USER_ROLE.TELLER) {
        throw new ForbiddenError('Cannot change teller role');
      }
      // Prevent branch changes
      if (data.branchId && data.branchId !== req.user!.branchId) {
        throw new ForbiddenError('Cannot move teller to another branch');
      }
    }

    const result = await adminService.updateUser(req.params.userId, req.tenantId!, data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Deactivate a user (soft delete) - bank_admin only
 */
router.delete('/users/:userId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    await adminService.deactivateUser(req.params.userId, req.tenantId!);

    res.json({
      success: true,
      message: 'User deactivated',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// SMS TEST (bank_admin only - for development)
// ============================================================

/**
 * POST /api/admin/test-sms
 * Send a test SMS to verify Twilio configuration
 * Body: { phone: "+216XXXXXXXX" }
 */
router.post('/test-sms', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number required',
      });
    }

    // Check if Twilio is configured
    const { config } = await import('../config');
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_PHONE_NUMBER) {
      return res.status(400).json({
        success: false,
        error: 'Twilio not configured. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env',
      });
    }

    // Send test SMS
    const twilio = await import('twilio');
    const client = twilio.default(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

    const message = await client.messages.create({
      body: '🎫 BléSaf Test - SMS notifications are working! Configuration successful.',
      to: phone,
      from: config.TWILIO_PHONE_NUMBER,
    });

    res.json({
      success: true,
      message: 'Test SMS sent successfully',
      data: {
        messageId: message.sid,
        status: message.status,
        to: phone,
        from: config.TWILIO_PHONE_NUMBER,
      },
    });
  } catch (error: any) {
    // Handle Twilio-specific errors
    if (error.code) {
      return res.status(400).json({
        success: false,
        error: `Twilio error: ${error.message}`,
        code: error.code,
        moreInfo: error.moreInfo,
      });
    }
    next(error);
  }
});

// ============================================================
// WHATSAPP TEST (bank_admin only - for development)
// ============================================================

/**
 * POST /api/admin/test-whatsapp
 * Send a test WhatsApp message to verify Meta configuration
 * Body: { phone: "+216XXXXXXXX" }
 */
router.post('/test-whatsapp', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number required',
      });
    }

    // Check if Meta WhatsApp is configured (use process.env directly as config caching has issues)
    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured. Check WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN in .env',
      });
    }

    // Send test message using Meta Cloud API
    const formattedPhone = phone.replace(/^\+/, '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        body: '🎫 BléSaf Test - WhatsApp notifications are working! Configuration successful.',
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json() as { messages?: { id: string }[]; error?: { message: string; code: number } };

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: result.error?.message || `API error: ${response.status}`,
        code: result.error?.code,
      });
    }

    res.json({
      success: true,
      message: 'Test WhatsApp sent successfully',
      data: {
        messageId: result.messages?.[0]?.id,
        to: formattedPhone,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
