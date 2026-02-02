import { Router } from 'express';
import { analyticsQuerySchema, dateRangeSchema } from '@blesaf/shared';
import { analyticsService } from '../services/analyticsService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/analytics/branch/:branchId/today
 * Get today's statistics for a branch
 */
router.get('/branch/:branchId/today', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const result = await analyticsService.getTodayStats(branchId, req.tenantId!, req.user!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/branch/:branchId/history
 * Get historical statistics for a branch
 */
router.get('/branch/:branchId/history', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const query = analyticsQuerySchema.parse(req.query);

    const result = await analyticsService.getHistoricalStats(branchId, query, req.tenantId!, req.user!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/branch/:branchId/agents
 * Get agent performance stats for a branch
 */
router.get('/branch/:branchId/agents', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const query = dateRangeSchema.parse(req.query);

    const result = await analyticsService.getAgentStats(branchId, query, req.tenantId!, req.user!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/branch/:branchId/hourly
 * Get hourly breakdown for a branch
 */
router.get('/branch/:branchId/hourly', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date } = req.query;

    const result = await analyticsService.getHourlyBreakdown(
      branchId,
      date ? new Date(date as string) : new Date(),
      req.tenantId!,
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
 * GET /api/analytics/branch/:branchId/comparison
 * Get today vs yesterday comparison for branch manager dashboard
 */
router.get('/branch/:branchId/comparison', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const result = await analyticsService.getBranchComparison(branchId, req.tenantId!, req.user!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/tenant/ranking
 * Get branch ranking for competitive awareness (accessible by branch managers)
 */
router.get('/tenant/ranking', requireRole('bank_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const result = await analyticsService.getBranchRanking(req.tenantId!, req.user!.branchId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/tenant/overview
 * Get all-branches summary for HQ (bank_admin only)
 */
router.get('/tenant/overview', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const result = await analyticsService.getTenantOverview(req.tenantId!);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/tenant/compare
 * Compare branches (bank_admin only)
 */
router.get('/tenant/compare', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const query = dateRangeSchema.parse(req.query);

    const result = await analyticsService.compareBranches(req.tenantId!, query);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/tenant/services
 * Get service category breakdown across tenant
 */
router.get('/tenant/services', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const query = dateRangeSchema.parse(req.query);

    const result = await analyticsService.getServiceCategoryBreakdown(req.tenantId!, query);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
