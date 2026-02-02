import { Router } from 'express';
import {
  checkinSchema,
  callNextSchema,
  transferTicketSchema,
  completeTicketSchema,
} from '@blesaf/shared';
import { queueService } from '../services/queueService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

/**
 * POST /api/queue/checkin
 * Create a new ticket (public - kiosk/mobile)
 */
router.post('/checkin', async (req, res, next) => {
  try {
    const data = checkinSchema.parse(req.body);

    const result = await queueService.createTicket(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/call-next
 * Call next ticket for a counter (teller only)
 */
router.post('/call-next', authenticate, requireRole('teller', 'branch_manager'), async (req, res, next) => {
  try {
    const data = callNextSchema.parse(req.body);

    const result = await queueService.callNextTicket(data.counterId, req.user!.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/counter/:counterId/call-next-service/:serviceId
 * Call next ticket for a specific service (teller only)
 */
router.post(
  '/counter/:counterId/call-next-service/:serviceId',
  authenticate,
  requireRole('teller', 'branch_manager'),
  async (req, res, next) => {
    try {
      const { counterId, serviceId } = req.params;

      const result = await queueService.callNextByService(counterId, serviceId, req.user!.userId);

      if (!result) {
        res.json({
          success: false,
          error: 'No waiting tickets for this service',
        });
        return;
      }

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
 * POST /api/queue/:ticketId/serve
 * Mark ticket as serving (teller only)
 */
router.post('/:ticketId/serve', authenticate, requireRole('teller', 'branch_manager'), async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const result = await queueService.startServing(ticketId, req.user!.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/:ticketId/complete
 * Mark ticket as completed (teller only)
 */
router.post('/:ticketId/complete', authenticate, requireRole('teller', 'branch_manager'), async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const data = completeTicketSchema.parse(req.body);

    const result = await queueService.completeTicket(ticketId, req.user!.userId, data.notes);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/:ticketId/no-show
 * Mark ticket as no-show (teller only)
 */
router.post('/:ticketId/no-show', authenticate, requireRole('teller', 'branch_manager'), async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const result = await queueService.markNoShow(ticketId, req.user!.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/:ticketId/transfer
 * Transfer ticket to another service (teller only)
 */
router.post('/:ticketId/transfer', authenticate, requireRole('teller', 'branch_manager'), async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const data = transferTicketSchema.parse(req.body);

    const result = await queueService.transferTicket(
      ticketId,
      data.targetServiceCategoryId,
      req.user!.userId,
      data.notes
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
 * POST /api/queue/:ticketId/cancel
 * Cancel a ticket (teller/manager only)
 */
router.post('/:ticketId/cancel', authenticate, requireRole('teller', 'branch_manager'), async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const result = await queueService.cancelTicket(ticketId, req.user!.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/:ticketId/bump-priority
 * Bump ticket to VIP priority (branch_manager only)
 * Moves the ticket to the front of the queue
 */
router.post('/:ticketId/bump-priority', authenticate, requireRole('branch_manager', 'bank_admin'), async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const result = await queueService.bumpTicketPriority(ticketId, req.user!.userId);

    res.json({
      success: true,
      data: result,
      message: 'Ticket bumped to front of queue',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/queue/branches
 * List active branches (public - for display/kiosk selection)
 */
router.get('/branches', async (req, res, next) => {
  try {
    const result = await queueService.listBranchesForDisplay();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/queue/branch/:branchId/status
 * Get branch queue status (public - for display)
 */
router.get('/branch/:branchId/status', async (req, res, next) => {
  try {
    const { branchId } = req.params;

    const result = await queueService.getBranchQueueStatus(branchId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/queue/ticket/:ticketId/status
 * Get ticket position (public - for customer tracking)
 */
router.get('/ticket/:ticketId/status', async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const result = await queueService.getTicketPosition(ticketId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/queue/branch/:branchId/teller
 * Get queue view for teller (auth required)
 */
router.get('/branch/:branchId/teller', authenticate, requireRole('teller', 'branch_manager'), async (req, res, next) => {
  try {
    const { branchId } = req.params;

    const result = await queueService.getTellerQueueView(branchId, req.user!.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
