import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';
import { hqMetricsService } from '../services/hqMetricsService';
import { hqRecommendationEngine } from '../services/hqRecommendationEngine';

const router = Router();

// All HQ routes require bank_admin authentication
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/hq/metrics
 * Get tenant-level composite metrics (network health, capacity, SLA)
 */
router.get('/metrics', requireRole('bank_admin', 'super_admin'), async (req, res, next) => {
  try {
    const metrics = await hqMetricsService.getTenantCompositeMetrics(req.tenantId!);
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hq/branches
 * Get per-branch health scores for the performance matrix
 */
router.get('/branches', requireRole('bank_admin', 'super_admin'), async (req, res, next) => {
  try {
    const branches = await hqMetricsService.getBranchHealthScores(req.tenantId!);
    res.json({ success: true, data: branches });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hq/recommendations
 * Get tenant-level recommendations
 */
router.get('/recommendations', requireRole('bank_admin', 'super_admin'), async (req, res, next) => {
  try {
    const recommendations = await hqRecommendationEngine.generateTenantRecommendations(req.tenantId!);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
});

export default router;
