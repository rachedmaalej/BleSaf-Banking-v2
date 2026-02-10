import { Router } from 'express';
import {
  createServiceTemplateSchema,
  updateServiceTemplateSchema,
  copyTemplatesToBranchSchema,
  bulkDeploySchema,
  syncTemplateSchema,
  resetServiceFieldSchema,
  paginationSchema,
} from '@blesaf/shared';
import { templateService } from '../services/templateService';
import { auditService } from '../services/auditService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// All template routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// ============================================================
// SERVICE TEMPLATE MANAGEMENT (bank_admin only)
// ============================================================

/**
 * GET /api/templates
 * List all service templates for tenant
 * Access: bank_admin, super_admin
 */
router.get('/', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const activeOnly = req.query.activeOnly === 'true';
    const result = await templateService.listTemplates(
      req.tenantId!,
      pagination,
      activeOnly
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
 * POST /api/templates
 * Create a new service template
 * Access: bank_admin
 */
router.post('/', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = createServiceTemplateSchema.parse(req.body);
    const result = await templateService.createTemplate(req.tenantId!, data, req.user?.userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:templateId
 * Get template details
 * Access: bank_admin
 */
router.get('/:templateId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const result = await templateService.getTemplate(
      req.params.templateId,
      req.tenantId!
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
 * PATCH /api/templates/:templateId
 * Update a service template
 * Access: bank_admin
 */
router.patch('/:templateId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = updateServiceTemplateSchema.parse(req.body);
    const result = await templateService.updateTemplate(
      req.params.templateId,
      req.tenantId!,
      data,
      req.user?.userId
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
 * DELETE /api/templates/:templateId
 * Delete a service template (soft delete - marks inactive)
 * Access: bank_admin
 */
router.delete('/:templateId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    await templateService.deleteTemplate(req.params.templateId, req.tenantId!);

    res.json({
      success: true,
      message: 'Template supprime',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/templates/copy-to-branch
 * Copy selected templates to a branch as actual services
 * Access: bank_admin
 */
router.post('/copy-to-branch', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = copyTemplatesToBranchSchema.parse(req.body);
    const result = await templateService.copyTemplatesToBranch(
      req.tenantId!,
      data.branchId,
      data.templateIds,
      req.user?.userId
    );

    res.json({
      success: true,
      data: result,
      message: `${result.created} service(s) cree(s), ${result.skipped} ignore(s) (prefixe duplique)`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/templates/bulk-deploy
 * Deploy templates to multiple branches/groups at once
 * Access: bank_admin
 */
router.post('/bulk-deploy', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = bulkDeploySchema.parse(req.body);
    const result = await templateService.bulkDeploy(
      req.tenantId!,
      data.templateIds,
      data.branchIds,
      data.groupIds,
      req.user?.userId
    );

    res.json({
      success: true,
      data: result,
      message: `${result.totals.created} service(s) cree(s), ${result.totals.reactivated} reactive(s), ${result.totals.skipped} ignore(s)`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:templateId/deployment-status
 * Get deployment status across branches for a template
 * Access: bank_admin
 */
router.get('/:templateId/deployment-status', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const result = await templateService.getDeploymentStatus(
      req.params.templateId,
      req.tenantId!
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
 * GET /api/templates/:templateId/drift-report
 * Get drift report for a specific template
 * Access: bank_admin
 */
router.get('/:templateId/drift-report', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const result = await templateService.getDriftReport(
      req.tenantId!,
      req.params.templateId
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
 * POST /api/templates/:templateId/sync
 * Push template changes to all linked services
 * Access: bank_admin
 */
router.post('/:templateId/sync', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = syncTemplateSchema.parse(req.body);
    const result = await templateService.syncTemplate(
      req.params.templateId,
      req.tenantId!,
      req.user!.userId,
      data.force
    );

    res.json({
      success: true,
      data: result,
      message: `${result.syncCount} service(s) synchronise(s)`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:templateId/history
 * Get change history for a template
 * Access: bank_admin
 */
router.get('/:templateId/history', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await auditService.getHistory('template', req.params.templateId, pagination.page, pagination.pageSize);

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
 * GET /api/templates/drift-report/all
 * Get tenant-wide drift report
 * Access: bank_admin
 */
router.get('/drift-report/all', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const result = await templateService.getDriftReport(req.tenantId!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
