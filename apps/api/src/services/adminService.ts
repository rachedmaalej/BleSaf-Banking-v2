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
} from '@blesaf/shared';
import { canManageUser } from '../middleware/rbac';

export const adminService = {
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
        status: ENTITY_STATUS.ACTIVE,
      },
    });

    logger.info({ branchId: branch.id, tenantId, name: branch.name }, 'Branch created');

    return branch;
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

  async deleteServiceCategory(serviceId: string, tenantId: string) {
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
      logger.info({ serviceId }, 'Service category deactivated');
    } else {
      await prisma.counterService.deleteMany({ where: { serviceId } });
      await prisma.serviceCategory.delete({ where: { id: serviceId } });
      logger.info({ serviceId }, 'Service category deleted');
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
