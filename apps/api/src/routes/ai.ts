import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole, requireBranchAccess } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';
import { metricsService } from '../services/metricsService';
import { forecastService } from '../services/forecastService';
import { recommendationEngine } from '../services/recommendationEngine';
import { adminService } from '../services/adminService';
import { queueService } from '../services/queueService';
import { breakService } from '../services/breakService';
import { getRedisClient } from '../lib/redis';
import { BadRequestError, NotFoundError } from '../lib/errors';
import type { RecommendationActionType } from '@blesaf/shared';

const router = Router();

// All AI routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/ai/branch/:branchId/composite
 * Get composite metrics (Queue Health Score, Capacity, SLA Trajectory)
 */
router.get('/branch/:branchId/composite', requireRole('bank_admin', 'branch_manager'), requireBranchAccess(), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const metrics = await metricsService.getCompositeMetrics(branchId, req.tenantId!, req.user!);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/branch/:branchId/forecast
 * Get hourly demand forecast for next 4 hours
 * Returns null when insufficient historical data
 */
router.get('/branch/:branchId/forecast', requireRole('bank_admin', 'branch_manager'), requireBranchAccess(), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const forecast = await forecastService.getHourlyForecast(branchId, req.tenantId!, req.user!);

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/branch/:branchId/recommendations
 * Get rule-based recommendations with urgency levels
 */
router.get('/branch/:branchId/recommendations', requireRole('bank_admin', 'branch_manager'), requireBranchAccess(), async (req, res, next) => {
  try {
    const { branchId } = req.params;

    // Get composite metrics and forecast for recommendation context
    const [compositeMetrics, forecast] = await Promise.all([
      metricsService.getCompositeMetrics(branchId, req.tenantId!, req.user!),
      forecastService.getHourlyForecast(branchId, req.tenantId!, req.user!),
    ]);

    const recommendations = await recommendationEngine.generateRecommendations(
      branchId,
      compositeMetrics,
      forecast
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/branch/:branchId/recommendations/:id/execute
 * Execute a recommendation action
 * Maps recommendation actionType to existing API actions
 */
router.post('/branch/:branchId/recommendations/:id/execute', requireRole('branch_manager', 'bank_admin'), requireBranchAccess(), async (req, res, next) => {
  try {
    const { branchId, id } = req.params;

    // Fetch fresh recommendations to verify the action still exists
    const [compositeMetrics, forecast] = await Promise.all([
      metricsService.getCompositeMetrics(branchId, req.tenantId!, req.user!),
      forecastService.getHourlyForecast(branchId, req.tenantId!, req.user!),
    ]);

    const recommendations = await recommendationEngine.generateRecommendations(
      branchId,
      compositeMetrics,
      forecast
    );

    const recommendation = recommendations.find((r) => r.id === id);
    if (!recommendation) {
      throw new NotFoundError('Recommendation not found or no longer applicable');
    }

    if (!recommendation.executable) {
      throw new BadRequestError('This recommendation is not executable');
    }

    // Execute the action based on actionType
    let result: unknown;
    const actionType = recommendation.actionType as RecommendationActionType;

    switch (actionType) {
      case 'open_counter':
      case 'pre_open_counter': {
        if (!recommendation.targetId) {
          throw new BadRequestError('No target counter specified');
        }
        result = await adminService.updateCounter(
          recommendation.targetId,
          req.tenantId!,
          { status: 'open' },
          req.user!
        );
        break;
      }

      case 'bump_priority': {
        if (!recommendation.targetId) {
          throw new BadRequestError('No target ticket specified');
        }
        result = await queueService.bumpTicketPriority(
          recommendation.targetId,
          req.user!.userId,
          'AI recommendation: long wait time'
        );
        break;
      }

      case 'end_break': {
        if (!recommendation.targetId) {
          throw new BadRequestError('No target break specified');
        }
        result = await breakService.endBreak({
          breakId: recommendation.targetId,
          endedById: req.user!.userId,
        });
        break;
      }

      default:
        throw new BadRequestError(`Action type "${actionType}" is not executable`);
    }

    // Invalidate caches after executing action
    const redis = getRedisClient();
    await Promise.all([
      redis.del(`metrics:composite:${branchId}`),
      redis.del(`ai:recommendations:${branchId}`),
    ]);

    res.json({
      success: true,
      data: result,
      message: `Action exécutée: ${recommendation.action}`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
