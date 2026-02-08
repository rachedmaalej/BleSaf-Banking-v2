import { prisma } from '../lib/prisma';
import { authService } from './authService';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../lib/errors';
import { logger } from '../lib/logger';
import {
  CreateTenantInput,
  UpdateTenantInput,
  CreateBranchInput,
  UpdateBranchInput,
  CreateCounterInput,
  UpdateCounterInput,
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput,
  CreateUserInput,
  UpdateUserInput,
  PaginationInput,
  JWTPayload,
  USER_ROLE,
  ENTITY_STATUS,
  TICKET_STATUS,
  CreateBranchCompleteInput,
} from '@blesaf/shared';
import { canManageUser } from '../middleware/rbac';
import { emitQueueUpdated, emitCounterUpdated } from '../socket';
import { queueService } from './queueService';

/**
 * Generate a unique branch code from a name.
 * "Agence La Marsa" → "LM01", if "LM01" exists → "LM02", etc.
 */
function generateUniqueBranchCode(name: string, existingCodes: string[]): string {
  // Remove common prefixes and extract initials
  const cleanName = name
    .replace(/^agence\s+/i, '')
    .replace(/^(de\s+|du\s+|la\s+|le\s+|les\s+|l')/gi, '')
    .trim();

  const words = cleanName.split(/\s+/).filter(Boolean);

  // Get base from first two words' initials, or first two chars if single word
  let base: string;
  if (words.length >= 2) {
    base = words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');
  } else if (words.length === 1 && words[0].length >= 2) {
    base = words[0].slice(0, 2).toUpperCase();
  } else {
    base = 'BR'; // Default fallback
  }

  // Find next available number
  const existingSet = new Set(existingCodes.map((c) => c.toUpperCase()));
  let num = 1;
  while (existingSet.has(`${base}${String(num).padStart(2, '0')}`)) {
    num++;
  }

  return `${base}${String(num).padStart(2, '0')}`;
}

export const adminService = {
  // ============================================================
  // BRANCH CODE GENERATION
  // ============================================================

  /**
   * Suggest a unique branch code based on name.
   * Called from wizard to auto-generate codes.
   */
  async suggestBranchCode(tenantId: string, name: string): Promise<string> {
    // Get all existing branch codes for this tenant
    const existingBranches = await prisma.branch.findMany({
      where: { tenantId },
      select: { code: true },
    });

    const existingCodes = existingBranches.map((b) => b.code);
    return generateUniqueBranchCode(name, existingCodes);
  },

  /**
   * Check if a branch code is available
   */
  async isBranchCodeAvailable(tenantId: string, code: string): Promise<boolean> {
    const existing = await prisma.branch.findFirst({
      where: { tenantId, code: code.toUpperCase() },
    });
    return !existing;
  },

  // ============================================================
  // TENANT MANAGEMENT
  // ============================================================

  async listTenants(pagination: PaginationInput) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { branches: true, users: true } },
        },
      }),
      prisma.tenant.count(),
    ]);

    return {
      data: tenants,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async createTenant(data: CreateTenantInput) {
    // Check for duplicate subdomain
    const existing = await prisma.tenant.findUnique({
      where: { subdomain: data.subdomain },
    });

    if (existing) {
      throw new ConflictError('Subdomain already in use');
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor || null,
        languageConfig: data.languageConfig || { default: 'fr', available: ['fr', 'ar'] },
        status: ENTITY_STATUS.ACTIVE,
      },
    });

    logger.info({ tenantId: tenant.id, name: tenant.name }, 'Tenant created');

    return tenant;
  },

  async getTenant(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: { select: { id: true, name: true, code: true, status: true } },
        _count: { select: { branches: true, users: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    return tenant;
  },

  async updateTenant(tenantId: string, data: UpdateTenantInput) {
    // Check subdomain uniqueness if being changed
    if (data.subdomain) {
      const existing = await prisma.tenant.findFirst({
        where: { subdomain: data.subdomain, id: { not: tenantId } },
      });
      if (existing) {
        throw new ConflictError('Subdomain already in use');
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    logger.info({ tenantId }, 'Tenant updated');

    return tenant;
  },

  /**
   * Update tenant default operating hours (bank_admin)
   */
  async updateTenantDefaultHours(
    tenantId: string,
    data: { defaultOpeningTime?: string | null; defaultClosingTime?: string | null }
  ) {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        defaultOpeningTime: data.defaultOpeningTime,
        defaultClosingTime: data.defaultClosingTime,
      },
    });

    logger.info({ tenantId }, 'Tenant default hours updated');

    return tenant;
  },

  /**
   * Get tenant default operating hours
   */
  async getTenantDefaultHours(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        defaultOpeningTime: true,
        defaultClosingTime: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    return tenant;
  },

  // ============================================================
  // BRANCH MANAGEMENT
  // ============================================================

  async listBranches(tenantId: string, pagination: PaginationInput) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where: { tenantId },
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { counters: true, services: true } },
        },
      }),
      prisma.branch.count({ where: { tenantId } }),
    ]);

    return {
      data: branches,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async createBranch(tenantId: string, data: CreateBranchInput) {
    // Check for duplicate code within tenant
    const existing = await prisma.branch.findFirst({
      where: { tenantId, code: data.code },
    });

    if (existing) {
      throw new ConflictError('Branch code already in use');
    }

    const branch = await prisma.branch.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        address: data.address || null,
        region: data.region || null,
        timezone: data.timezone || 'Africa/Tunis',
        notifyAtPosition: data.notifyAtPosition || 2,
        status: data.status || ENTITY_STATUS.INACTIVE,
      },
    });

    logger.info({ branchId: branch.id, tenantId, name: branch.name }, 'Branch created');

    return branch;
  },

  /**
   * Create a complete branch with services and counters in a single atomic transaction.
   * This is the recommended way to create branches as it ensures no incomplete branches.
   */
  async createBranchComplete(tenantId: string, data: CreateBranchCompleteInput) {
    // Check for duplicate code within tenant
    const existingBranch = await prisma.branch.findFirst({
      where: { tenantId, code: data.code },
    });

    if (existingBranch) {
      throw new ConflictError('Branch code already in use');
    }

    // Verify all templates exist and are active
    const templates = await prisma.serviceTemplate.findMany({
      where: { id: { in: data.templateIds }, tenantId, isActive: true },
    });

    if (templates.length !== data.templateIds.length) {
      throw new BadRequestError('One or more templates not found or inactive');
    }

    // Check for duplicate prefixes in templates
    const prefixes = templates.map((t) => t.prefix);
    const uniquePrefixes = new Set(prefixes);
    if (prefixes.length !== uniquePrefixes.size) {
      throw new BadRequestError('Selected templates have duplicate prefixes');
    }

    // Execute everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create branch
      const branch = await tx.branch.create({
        data: {
          tenantId,
          name: data.name,
          code: data.code,
          address: data.address || null,
          region: data.region || null,
          timezone: data.timezone || 'Africa/Tunis',
          notifyAtPosition: data.notifyAtPosition || 2,
          status: ENTITY_STATUS.ACTIVE, // New branches start active
        },
      });

      // 2. Copy templates to services
      const services = await Promise.all(
        templates.map((template) =>
          tx.serviceCategory.create({
            data: {
              branchId: branch.id,
              nameAr: template.nameAr,
              nameFr: template.nameFr,
              prefix: template.prefix,
              icon: template.icon,
              priorityWeight: template.priorityWeight,
              avgServiceTime: template.avgServiceTime,
              isActive: true,
            },
          })
        )
      );

      const serviceIds = services.map((s) => s.id);

      // 3. Create counters (all assigned to all services by default)
      const counters = await Promise.all(
        Array.from({ length: data.counterCount }, (_, i) =>
          tx.counter.create({
            data: {
              branchId: branch.id,
              number: i + 1,
              label: null,
              status: 'closed',
              assignedServices: {
                create: serviceIds.map((serviceId) => ({ serviceId })),
              },
            },
          })
        )
      );

      return { branch, services, counters };
    });

    logger.info(
      {
        branchId: result.branch.id,
        tenantId,
        name: result.branch.name,
        servicesCreated: result.services.length,
        countersCreated: result.counters.length,
      },
      'Complete branch created with services and counters'
    );

    return result;
  },

  async getBranch(branchId: string, tenantId: string) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        counters: {
          include: {
            assignedServices: { include: { service: true } },
            assignedUser: { select: { id: true, name: true } },
          },
          orderBy: { number: 'asc' },
        },
        services: { orderBy: { prefix: 'asc' } },
        _count: { select: { tickets: true } },
      },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    return branch;
  },

  async updateBranch(branchId: string, tenantId: string, data: UpdateBranchInput) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    // Check code uniqueness if being changed
    if (data.code && data.code !== branch.code) {
      const existing = await prisma.branch.findFirst({
        where: { tenantId, code: data.code, id: { not: branchId } },
      });
      if (existing) {
        throw new ConflictError('Branch code already in use');
      }
    }

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data,
    });

    logger.info({ branchId }, 'Branch updated');

    return updated;
  },

  async deleteBranch(branchId: string, tenantId: string) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: {
            tickets: { where: { status: { in: [TICKET_STATUS.WAITING, TICKET_STATUS.CALLED, TICKET_STATUS.SERVING] } } },
            users: true,
          },
        },
      },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    // Check if there are active tickets
    if (branch._count.tickets > 0) {
      throw new BadRequestError('Cannot delete branch with active tickets in queue');
    }

    // Check if there are users assigned to this branch
    if (branch._count.users > 0) {
      throw new BadRequestError('Cannot delete branch with assigned users. Reassign or remove users first.');
    }

    // Soft delete - mark as inactive
    await prisma.branch.update({
      where: { id: branchId },
      data: { status: ENTITY_STATUS.INACTIVE },
    });

    logger.info({ branchId, tenantId }, 'Branch deactivated');
  },

  // ============================================================
  // COUNTER MANAGEMENT
  // ============================================================

  async listCounters(tenantId: string, branchId: string | undefined, user: JWTPayload) {
    // Branch managers can only see their branch
    const where: any = {
      branch: { tenantId },
    };

    if (user.role === USER_ROLE.BRANCH_MANAGER) {
      where.branchId = user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    return prisma.counter.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        assignedServices: { include: { service: true } },
        assignedUser: { select: { id: true, name: true } },
        currentTicket: { select: { id: true, ticketNumber: true, status: true } },
      },
      orderBy: [{ branchId: 'asc' }, { number: 'asc' }],
    });
  },

  async createCounter(tenantId: string, data: CreateCounterInput, user: JWTPayload) {
    // Verify branch belongs to tenant
    const branch = await prisma.branch.findUnique({
      where: { id: data.branchId },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    // Branch managers can only create counters for their branch
    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== data.branchId) {
      throw new ForbiddenError('Cannot create counter for another branch');
    }

    // Check for duplicate counter number in branch
    const existing = await prisma.counter.findFirst({
      where: { branchId: data.branchId, number: data.number },
    });

    if (existing) {
      throw new ConflictError('Counter number already exists in this branch');
    }

    // Verify all services exist in the branch
    const services = await prisma.serviceCategory.findMany({
      where: { id: { in: data.serviceIds }, branchId: data.branchId },
    });

    if (services.length !== data.serviceIds.length) {
      throw new BadRequestError('One or more services not found in branch');
    }

    const counter = await prisma.counter.create({
      data: {
        branchId: data.branchId,
        number: data.number,
        label: data.label || null,
        status: 'closed',
        assignedServices: {
          create: data.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: {
        assignedServices: { include: { service: true } },
      },
    });

    logger.info({ counterId: counter.id, branchId: data.branchId }, 'Counter created');

    return counter;
  },

  async updateCounter(counterId: string, tenantId: string, data: UpdateCounterInput, user: JWTPayload) {
    const counter = await prisma.counter.findUnique({
      where: { id: counterId },
      include: { branch: true },
    });

    if (!counter || counter.branch.tenantId !== tenantId) {
      throw new NotFoundError('Counter not found');
    }

    // Branch managers can only update counters in their branch
    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== counter.branchId) {
      throw new ForbiddenError('Cannot update counter in another branch');
    }

    // Update services if provided
    if (data.serviceIds) {
      // Verify all services exist in the branch
      const services = await prisma.serviceCategory.findMany({
        where: { id: { in: data.serviceIds }, branchId: counter.branchId },
      });

      if (services.length !== data.serviceIds.length) {
        throw new BadRequestError('One or more services not found in branch');
      }

      // Delete existing and create new
      await prisma.counterService.deleteMany({ where: { counterId } });
      await prisma.counterService.createMany({
        data: data.serviceIds.map((serviceId) => ({ counterId, serviceId })),
      });
    }

    const updated = await prisma.counter.update({
      where: { id: counterId },
      data: {
        label: data.label !== undefined ? data.label : undefined,
        status: data.status,
        assignedUserId: data.assignedUserId !== undefined ? data.assignedUserId : undefined,
      },
      include: {
        assignedServices: { include: { service: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    });

    logger.info({ counterId }, 'Counter updated');

    return updated;
  },

  async deleteCounter(counterId: string, tenantId: string, user: JWTPayload) {
    const counter = await prisma.counter.findUnique({
      where: { id: counterId },
      include: { branch: true },
    });

    if (!counter || counter.branch.tenantId !== tenantId) {
      throw new NotFoundError('Counter not found');
    }

    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== counter.branchId) {
      throw new ForbiddenError('Cannot delete counter in another branch');
    }

    // Check if counter has a current ticket
    if (counter.currentTicketId) {
      throw new BadRequestError('Cannot delete counter with active ticket');
    }

    await prisma.counterService.deleteMany({ where: { counterId } });
    await prisma.counter.delete({ where: { id: counterId } });

    logger.info({ counterId }, 'Counter deleted');
  },

  async batchUpdateCounterStatus(
    tenantId: string,
    branchId: string,
    status: 'open' | 'closed',
    user: JWTPayload
  ) {
    // Verify branch belongs to tenant
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    // Branch managers can only update their own branch
    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot update counters in another branch');
    }

    // When closing counters, handle tickets that are currently being served or called
    if (status === 'closed') {
      // Get all counters with their current tickets
      const countersWithTickets = await prisma.counter.findMany({
        where: {
          branchId,
          status: { not: 'on_break' },
          currentTicketId: { not: null },
        },
        include: {
          currentTicket: true,
        },
      });

      // Return any CALLED or SERVING tickets back to WAITING status
      const ticketIds = countersWithTickets
        .filter((c) => c.currentTicket &&
          (c.currentTicket.status === TICKET_STATUS.CALLED ||
           c.currentTicket.status === TICKET_STATUS.SERVING))
        .map((c) => c.currentTicketId!)
        .filter(Boolean);

      if (ticketIds.length > 0) {
        await prisma.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: {
            status: TICKET_STATUS.WAITING,
            calledAt: null,
            servingStartedAt: null,
            counterId: null,
          },
        });

        logger.info({ branchId, ticketIds }, 'Tickets returned to queue due to batch counter close');
      }

      // Clear currentTicketId from all counters being closed
      await prisma.counter.updateMany({
        where: {
          branchId,
          status: { not: 'on_break' },
        },
        data: {
          currentTicketId: null,
        },
      });
    }

    // Update all counters in the branch
    const result = await prisma.counter.updateMany({
      where: {
        branchId,
        // Don't close counters that are on_break - they need to be ended first
        status: status === 'closed' ? { not: 'on_break' } : undefined,
      },
      data: { status },
    });

    // Emit queue and counter updates
    try {
      const queueStatus = await queueService.getBranchQueueStatus(branchId);
      emitQueueUpdated(branchId, queueStatus);

      // Get updated counters and emit
      const counters = await prisma.counter.findMany({
        where: { branchId },
        include: {
          currentTicket: {
            include: { serviceCategory: { select: { nameFr: true, prefix: true } } },
          },
          assignedUser: { select: { name: true } },
        },
      });
      emitCounterUpdated(branchId, { counters });
    } catch (err) {
      logger.error({ err, branchId }, 'Failed to emit socket events after batch counter update');
    }

    logger.info({ branchId, status, count: result.count }, 'Batch counter status update');

    return { updated: result.count };
  },

  async configureCounterCount(
    branchId: string,
    targetCount: number,
    tenantId: string,
    user: JWTPayload
  ) {
    // 1. Verify branch belongs to tenant
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    // 2. RBAC check - branch managers can only configure their own branch
    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot configure counters for another branch');
    }

    // 3. Get current counters ordered by number
    const currentCounters = await prisma.counter.findMany({
      where: { branchId },
      orderBy: { number: 'asc' },
    });

    const currentCount = currentCounters.length;

    // 4. No change needed
    if (targetCount === currentCount) {
      return {
        previousCount: currentCount,
        newCount: currentCount,
        created: 0,
        deleted: 0,
      };
    }

    // 5. Get all active services for the branch (needed for new counters)
    const services = await prisma.serviceCategory.findMany({
      where: { branchId, isActive: true },
    });

    // 6. INCREASING: Create new counters
    if (targetCount > currentCount) {
      if (services.length === 0) {
        throw new BadRequestError('Cannot create counters: no active services in this branch. Create services first.');
      }

      const serviceIds = services.map((s) => s.id);
      const highestNumber = currentCounters.length > 0
        ? Math.max(...currentCounters.map((c) => c.number))
        : 0;

      const countersToCreate = targetCount - currentCount;
      const newCounters = [];

      for (let i = 1; i <= countersToCreate; i++) {
        const newNumber = highestNumber + i;
        const counter = await prisma.counter.create({
          data: {
            branchId,
            number: newNumber,
            label: null,
            status: 'closed',
            assignedServices: {
              create: serviceIds.map((serviceId) => ({ serviceId })),
            },
          },
        });
        newCounters.push(counter);
      }

      logger.info({ branchId, created: countersToCreate }, 'Counters created via configuration');

      // Emit counter update
      try {
        const counters = await prisma.counter.findMany({
          where: { branchId },
          include: {
            currentTicket: {
              include: { serviceCategory: { select: { nameFr: true, prefix: true } } },
            },
            assignedUser: { select: { name: true } },
          },
        });
        emitCounterUpdated(branchId, { counters });
      } catch (err) {
        logger.error({ err, branchId }, 'Failed to emit socket events after counter creation');
      }

      return {
        previousCount: currentCount,
        newCount: targetCount,
        created: countersToCreate,
        deleted: 0,
      };
    }

    // 7. DECREASING: Validate and delete excess counters
    const countersToDelete = currentCount - targetCount;

    // Get counters to delete (highest numbers first)
    const countersToRemove = currentCounters
      .sort((a, b) => b.number - a.number)
      .slice(0, countersToDelete);

    // Check if any of these counters are not safe to delete
    const unsafeCounters = countersToRemove.filter(
      (c) => c.status !== 'closed' || c.currentTicketId !== null
    );

    if (unsafeCounters.length > 0) {
      const counterNumbers = unsafeCounters.map((c) => `G${c.number}`).join(', ');
      throw new BadRequestError(
        `Cannot reduce counters: ${counterNumbers} must be closed and have no active tickets. Close these counters first.`
      );
    }

    // Delete the counters (cascade will handle CounterService records)
    const counterIdsToDelete = countersToRemove.map((c) => c.id);

    await prisma.counterService.deleteMany({
      where: { counterId: { in: counterIdsToDelete } },
    });

    await prisma.counter.deleteMany({
      where: { id: { in: counterIdsToDelete } },
    });

    logger.info({ branchId, deleted: countersToDelete, counterIds: counterIdsToDelete }, 'Counters deleted via configuration');

    // Emit counter update
    try {
      const counters = await prisma.counter.findMany({
        where: { branchId },
        include: {
          currentTicket: {
            include: { serviceCategory: { select: { nameFr: true, prefix: true } } },
          },
          assignedUser: { select: { name: true } },
        },
      });
      emitCounterUpdated(branchId, { counters });
    } catch (err) {
      logger.error({ err, branchId }, 'Failed to emit socket events after counter deletion');
    }

    return {
      previousCount: currentCount,
      newCount: targetCount,
      created: 0,
      deleted: countersToDelete,
    };
  },

  // ============================================================
  // SERVICE CATEGORY MANAGEMENT
  // ============================================================

  async listServiceCategories(tenantId: string, branchId: string | undefined, user: JWTPayload) {
    const where: any = {
      branch: { tenantId },
    };

    if (user.role === USER_ROLE.BRANCH_MANAGER) {
      where.branchId = user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    return prisma.serviceCategory.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { counters: true, tickets: true } },
      },
      orderBy: [{ branchId: 'asc' }, { prefix: 'asc' }],
    });
  },

  async createServiceCategory(tenantId: string, data: CreateServiceCategoryInput) {
    const branch = await prisma.branch.findUnique({
      where: { id: data.branchId },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    // Check for duplicate prefix in branch
    const existing = await prisma.serviceCategory.findFirst({
      where: { branchId: data.branchId, prefix: data.prefix },
    });

    if (existing) {
      throw new ConflictError('Service prefix already exists in this branch');
    }

    const service = await prisma.serviceCategory.create({
      data: {
        branchId: data.branchId,
        nameAr: data.nameAr,
        nameFr: data.nameFr,
        prefix: data.prefix,
        icon: data.icon || null,
        priorityWeight: data.priorityWeight || 1,
        avgServiceTime: data.avgServiceTime || 10,
        isActive: true,
      },
    });

    logger.info({ serviceId: service.id, branchId: data.branchId }, 'Service category created');

    return service;
  },

  async updateServiceCategory(serviceId: string, tenantId: string, data: UpdateServiceCategoryInput) {
    const service = await prisma.serviceCategory.findUnique({
      where: { id: serviceId },
      include: { branch: true },
    });

    if (!service || service.branch.tenantId !== tenantId) {
      throw new NotFoundError('Service category not found');
    }

    // Check prefix uniqueness if being changed
    if (data.prefix && data.prefix !== service.prefix) {
      const existing = await prisma.serviceCategory.findFirst({
        where: { branchId: service.branchId, prefix: data.prefix, id: { not: serviceId } },
      });
      if (existing) {
        throw new ConflictError('Service prefix already exists in this branch');
      }
    }

    const updated = await prisma.serviceCategory.update({
      where: { id: serviceId },
      data,
    });

    logger.info({ serviceId }, 'Service category updated');

    return updated;
  },

  async deleteServiceCategory(serviceId: string, tenantId: string): Promise<{ softDeleted: boolean }> {
    const service = await prisma.serviceCategory.findUnique({
      where: { id: serviceId },
      include: { branch: true, _count: { select: { tickets: true } } },
    });

    if (!service || service.branch.tenantId !== tenantId) {
      throw new NotFoundError('Service category not found');
    }

    // Soft delete - mark as inactive instead of hard delete if has tickets
    if (service._count.tickets > 0) {
      await prisma.serviceCategory.update({
        where: { id: serviceId },
        data: { isActive: false },
      });
      logger.info({ serviceId }, 'Service category deactivated (has tickets)');
      return { softDeleted: true };
    } else {
      await prisma.counterService.deleteMany({ where: { serviceId } });
      await prisma.serviceCategory.delete({ where: { id: serviceId } });
      logger.info({ serviceId }, 'Service category deleted');
      return { softDeleted: false };
    }
  },

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  async listUsers(
    tenantId: string,
    pagination: PaginationInput,
    user: JWTPayload,
    branchId?: string,
    role?: string
  ) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };

    // Branch managers can only see users in their branch
    if (user.role === USER_ROLE.BRANCH_MANAGER) {
      where.branchId = user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          branchId: true,
          branch: { select: { id: true, name: true, code: true } },
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async createUser(tenantId: string, data: CreateUserInput) {
    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already in use');
    }

    // Verify branch if provided
    if (data.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
      });
      if (!branch || branch.tenantId !== tenantId) {
        throw new NotFoundError('Branch not found');
      }
    }

    // Tellers and branch managers require a branch
    if ((data.role === USER_ROLE.TELLER || data.role === USER_ROLE.BRANCH_MANAGER) && !data.branchId) {
      throw new BadRequestError('Branch is required for teller and branch manager roles');
    }

    const passwordHash = await authService.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        branchId: data.branchId || null,
        status: ENTITY_STATUS.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
    });

    logger.info({ userId: user.id, tenantId, role: user.role }, 'User created');

    return user;
  },

  async getUser(userId: string, tenantId: string, requestingUser: JWTPayload) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify tenant access
    const fullUser = await prisma.user.findUnique({ where: { id: userId } });
    if (fullUser?.tenantId !== tenantId) {
      throw new NotFoundError('User not found');
    }

    // Branch managers can only see users in their branch
    if (requestingUser.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== requestingUser.branchId) {
      throw new ForbiddenError('Cannot access user from another branch');
    }

    return user;
  },

  async updateUser(userId: string, tenantId: string, data: UpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundError('User not found');
    }

    // Check email uniqueness if being changed
    if (data.email && data.email.toLowerCase() !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existing) {
        throw new ConflictError('Email already in use');
      }
    }

    // Verify branch if being changed
    if (data.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
      });
      if (!branch || branch.tenantId !== tenantId) {
        throw new NotFoundError('Branch not found');
      }
    }

    const updateData: any = { ...data };

    // Hash password if provided
    if (data.password) {
      updateData.passwordHash = await authService.hashPassword(data.password);
      delete updateData.password;
    }

    if (data.email) {
      updateData.email = data.email.toLowerCase();
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        updatedAt: true,
      },
    });

    logger.info({ userId }, 'User updated');

    return updated;
  },

  async deactivateUser(userId: string, tenantId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: ENTITY_STATUS.INACTIVE },
    });

    // Revoke all refresh tokens
    await authService.logoutAllDevices(userId);

    logger.info({ userId }, 'User deactivated');
  },
};
