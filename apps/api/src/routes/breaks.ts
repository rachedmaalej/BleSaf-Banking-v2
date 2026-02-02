import { Router } from 'express';
import { z } from 'zod';
import { breakService, BREAK_REASONS, BreakReason } from '../services/breakService';
import { authenticate } from '../middleware/auth';
import { requireRole, requireBranchAccess } from '../middleware/rbac';

const router = Router();

// All break routes require authentication and branch_manager+ role
router.use(authenticate);
router.use(requireRole('branch_manager'));

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const startBreakSchema = z.object({
  counterId: z.string().uuid(),
  reason: z.enum(['lunch', 'prayer', 'personal', 'urgent'] as const),
  durationMins: z.number().int().min(1).max(120),
});

const extendBreakSchema = z.object({
  additionalMins: z.number().int().min(1).max(60),
});

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /api/breaks/start
 * Start a teller break
 */
router.post('/start', async (req, res, next) => {
  try {
    const data = startBreakSchema.parse(req.body);

    const result = await breakService.startBreak({
      counterId: data.counterId,
      reason: data.reason,
      durationMins: data.durationMins,
      startedById: req.user!.userId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/breaks/:breakId/end
 * End a teller break
 */
router.post('/:breakId/end', async (req, res, next) => {
  try {
    const { breakId } = req.params;

    const result = await breakService.endBreak({
      breakId,
      endedById: req.user!.userId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/breaks/:breakId/extend
 * Extend an active break
 */
router.patch('/:breakId/extend', async (req, res, next) => {
  try {
    const { breakId } = req.params;
    const data = extendBreakSchema.parse(req.body);

    const result = await breakService.extendBreak({
      breakId,
      additionalMins: data.additionalMins,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/breaks/branch/:branchId
 * Get all breaks for a branch (today by default)
 */
router.get('/branch/:branchId', requireBranchAccess(), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : undefined;
    const result = await breakService.getBranchBreaks(branchId, targetDate);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/breaks/counter/:counterId
 * Get active break for a specific counter
 */
router.get('/counter/:counterId', async (req, res, next) => {
  try {
    const { counterId } = req.params;
    const result = await breakService.getCounterBreak(counterId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/breaks/reasons
 * Get available break reasons (for UI dropdown)
 */
router.get('/reasons', (req, res) => {
  const reasons = Object.entries(BREAK_REASONS).map(([key, value]) => ({
    value: key,
    label: value.label,
    defaultMins: value.defaultMins,
  }));

  res.json({
    success: true,
    data: reasons,
  });
});

export default router;
