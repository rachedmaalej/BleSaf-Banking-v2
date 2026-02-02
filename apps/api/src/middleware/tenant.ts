import { Request, Response, NextFunction } from 'express';
import { prisma, setTenantContext } from '../lib/prisma';
import { UnauthorizedError, NotFoundError } from '../lib/errors';

/**
 * Tenant middleware
 * Resolves tenant from:
 * 1. JWT token (req.tenantId from auth middleware)
 * 2. x-tenant-id header (for public endpoints)
 * 3. Subdomain (for web clients)
 *
 * Also sets PostgreSQL session variable for RLS
 */
export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    // Priority 1: From authenticated user
    if (req.tenantId) {
      await setTenantContext(req.tenantId);
      return next();
    }

    // Priority 2: From x-tenant-id header
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: headerTenantId, status: 'active' },
        select: { id: true },
      });

      if (!tenant) {
        throw new NotFoundError('Tenant not found');
      }

      req.tenantId = headerTenantId;
      await setTenantContext(headerTenantId);
      return next();
    }

    // Priority 3: From subdomain
    const host = req.headers.host;
    if (host) {
      const subdomain = extractSubdomain(host);
      if (subdomain) {
        const tenant = await prisma.tenant.findUnique({
          where: { subdomain, status: 'active' },
          select: { id: true },
        });

        if (tenant) {
          req.tenantId = tenant.id;
          await setTenantContext(tenant.id);
          return next();
        }
      }
    }

    // No tenant context available
    throw new UnauthorizedError('Tenant context required');
  } catch (error) {
    next(error);
  }
}

/**
 * Optional tenant middleware
 * Same as tenantMiddleware but doesn't throw if no tenant found
 */
export async function optionalTenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    // From authenticated user
    if (req.tenantId) {
      await setTenantContext(req.tenantId);
      return next();
    }

    // From x-tenant-id header
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: headerTenantId, status: 'active' },
        select: { id: true },
      });

      if (tenant) {
        req.tenantId = headerTenantId;
        await setTenantContext(headerTenantId);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require tenant for branch-level public routes
 * Extracts tenant from branch ID lookup
 */
export async function resolveTenantFromBranch(req: Request, _res: Response, next: NextFunction) {
  try {
    const branchId = req.params.branchId;

    if (!branchId) {
      throw new NotFoundError('Branch ID required');
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        tenantId: true,
        tenant: {
          select: { status: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    if (branch.tenant.status !== 'active') {
      throw new NotFoundError('Tenant is not active');
    }

    req.tenantId = branch.tenantId;
    await setTenantContext(branch.tenantId);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Extract subdomain from host header
 * e.g., "bnt.blesaf.app" -> "bnt"
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0];

  // Split by dots
  const parts = hostname.split('.');

  // Need at least 3 parts for subdomain (sub.domain.tld)
  if (parts.length >= 3) {
    // Return first part as subdomain
    // Skip common non-subdomain prefixes
    const firstPart = parts[0];
    if (firstPart !== 'www' && firstPart !== 'api') {
      return firstPart;
    }
  }

  return null;
}
