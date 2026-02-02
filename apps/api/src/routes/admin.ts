import { Router } from 'express';
import {
  createTenantSchema,
  updateTenantSchema,
  createBranchSchema,
  updateBranchSchema,
  createCounterSchema,
  updateCounterSchema,
  createServiceCategorySchema,
  updateServiceCategorySchema,
  createUserSchema,
  updateUserSchema,
  paginationSchema,
  USER_ROLE,
} from '@blesaf/shared';
import { adminService } from '../services/adminService';
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

// ============================================================
// BRANCH MANAGEMENT (bank_admin+)
// ============================================================

// Apply tenant middleware for all branch-level routes
router.use('/branches', tenantMiddleware);

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
    const result = await adminService.updateServiceCategory(req.params.serviceId, req.tenantId!, data);

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
    await adminService.deleteServiceCategory(req.params.serviceId, req.tenantId!);

    res.json({
      success: true,
      message: 'Service category deleted',
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

export default router;
