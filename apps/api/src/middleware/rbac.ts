import { Request, Response, NextFunction } from 'express';
import { UserRole, USER_ROLE } from '@blesaf/shared';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

// Role hierarchy - higher roles inherit permissions from lower roles
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLE.SUPER_ADMIN]: 4,
  [USER_ROLE.BANK_ADMIN]: 3,
  [USER_ROLE.BRANCH_MANAGER]: 2,
  [USER_ROLE.TELLER]: 1,
};

/**
 * Require one of the specified roles
 * Higher roles automatically have access to lower role permissions
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role as UserRole;
    const userRoleLevel = ROLE_HIERARCHY[userRole];

    // Check if user's role is in allowed roles OR has a higher role
    const hasAccess = allowedRoles.some((role) => {
      const requiredLevel = ROLE_HIERARCHY[role];
      return userRoleLevel >= requiredLevel;
    });

    if (!hasAccess) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Require exact role (no hierarchy)
 */
export function requireExactRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Require branch access
 * Ensures user can only access their assigned branch (unless bank_admin+)
 */
export function requireBranchAccess(branchIdParam: string = 'branchId') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role as UserRole;
    const userBranchId = req.user.branchId;
    const requestedBranchId = req.params[branchIdParam] || req.query[branchIdParam] || req.body[branchIdParam];

    // Super admin and bank admin can access any branch in their tenant
    if (userRole === USER_ROLE.SUPER_ADMIN || userRole === USER_ROLE.BANK_ADMIN) {
      return next();
    }

    // Branch manager and teller can only access their assigned branch
    if (userBranchId !== requestedBranchId) {
      return next(new ForbiddenError('Access denied to this branch'));
    }

    next();
  };
}

/**
 * Check if user can manage another user based on roles
 * Users can only manage users with lower role levels
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  const managerLevel = ROLE_HIERARCHY[managerRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];

  return managerLevel > targetLevel;
}

/**
 * Check if user has at least a certain role level
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
