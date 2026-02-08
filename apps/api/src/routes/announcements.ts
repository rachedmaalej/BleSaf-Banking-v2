import { Router } from 'express';
import { z } from 'zod';
import { announcementService } from '../services/announcementService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// Validation schemas
const createAnnouncementSchema = z.object({
  branchId: z.string().uuid(),
  message: z.string().min(1).max(200),
  messageAr: z.string().max(200).optional(),
  priority: z.enum(['normal', 'urgent']).optional().default('normal'),
  enableTts: z.boolean().optional().default(false),
  displayDuration: z.number().int().min(5).max(300).optional().default(30),
  expiresAt: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
});

/**
 * POST /api/announcements
 * Create a new announcement (branch_manager+)
 */
router.post(
  '/',
  authenticate,
  tenantMiddleware,
  requireRole('bank_admin', 'branch_manager'),
  async (req, res, next) => {
    try {
      const data = createAnnouncementSchema.parse(req.body);
      const result = await announcementService.create(
        data,
        req.user!.userId,
        req.tenantId!,
        req.user!
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Announcement created and broadcast',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/announcements/branch/:branchId/active
 * Get active announcements for a branch (public for displays)
 */
router.get('/branch/:branchId/active', async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const result = await announcementService.getActive(branchId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/announcements/branch/:branchId
 * Get announcement history for a branch (branch_manager+)
 */
router.get(
  '/branch/:branchId',
  authenticate,
  tenantMiddleware,
  requireRole('bank_admin', 'branch_manager'),
  async (req, res, next) => {
    try {
      const { branchId } = req.params;
      const { limit } = req.query;
      const result = await announcementService.getHistory(
        branchId,
        limit ? parseInt(limit as string, 10) : 20,
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
  }
);

/**
 * DELETE /api/announcements/:announcementId
 * Dismiss an announcement (branch_manager+)
 */
router.delete(
  '/:announcementId',
  authenticate,
  tenantMiddleware,
  requireRole('bank_admin', 'branch_manager'),
  async (req, res, next) => {
    try {
      const { announcementId } = req.params;
      await announcementService.dismiss(
        announcementId,
        req.user!.userId,
        req.tenantId!,
        req.user!
      );

      res.json({
        success: true,
        message: 'Announcement dismissed',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
