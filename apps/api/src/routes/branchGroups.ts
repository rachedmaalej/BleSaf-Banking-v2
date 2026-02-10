import { Router } from 'express';
import {
  createBranchGroupSchema,
  updateBranchGroupSchema,
  branchGroupMembershipSchema,
} from '@blesaf/shared';
import { branchGroupService } from '../services/branchGroupService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// All branch group routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * GET /api/branch-groups
 * List all branch groups for tenant
 * Access: bank_admin
 */
router.get('/', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const groups = await branchGroupService.listGroups(req.tenantId!);

    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/branch-groups
 * Create a new branch group
 * Access: bank_admin
 */
router.post('/', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = createBranchGroupSchema.parse(req.body);
    const group = await branchGroupService.createGroup(
      req.tenantId!,
      data.name,
      data.description
    );

    res.status(201).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/branch-groups/:groupId
 * Update a branch group
 * Access: bank_admin
 */
router.patch('/:groupId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = updateBranchGroupSchema.parse(req.body);
    const group = await branchGroupService.updateGroup(
      req.params.groupId,
      req.tenantId!,
      data
    );

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/branch-groups/:groupId
 * Delete a branch group
 * Access: bank_admin
 */
router.delete('/:groupId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    await branchGroupService.deleteGroup(req.params.groupId, req.tenantId!);

    res.json({
      success: true,
      message: 'Groupe supprime',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/branch-groups/:groupId/branches
 * Add branches to a group
 * Access: bank_admin
 */
router.post('/:groupId/branches', requireRole('bank_admin'), async (req, res, next) => {
  try {
    const data = branchGroupMembershipSchema.parse(req.body);
    const result = await branchGroupService.addBranches(
      req.params.groupId,
      req.tenantId!,
      data.branchIds
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
 * DELETE /api/branch-groups/:groupId/branches/:branchId
 * Remove a branch from a group
 * Access: bank_admin
 */
router.delete('/:groupId/branches/:branchId', requireRole('bank_admin'), async (req, res, next) => {
  try {
    await branchGroupService.removeBranch(
      req.params.groupId,
      req.tenantId!,
      req.params.branchId
    );

    res.json({
      success: true,
      message: 'Agence retiree du groupe',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
