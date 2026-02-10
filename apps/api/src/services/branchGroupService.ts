import { prisma } from '../lib/prisma';
import { NotFoundError, ConflictError } from '../lib/errors';
import { logger } from '../lib/logger';

export const branchGroupService = {
  /**
   * List all branch groups for a tenant with member counts
   */
  async listGroups(tenantId: string) {
    const groups = await prisma.branchGroup.findMany({
      where: { tenantId },
      include: {
        _count: { select: { memberships: true } },
        memberships: {
          include: {
            branch: { select: { id: true, name: true, code: true, region: true, status: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return groups.map((g) => ({
      id: g.id,
      tenantId: g.tenantId,
      name: g.name,
      description: g.description,
      memberCount: g._count.memberships,
      branches: g.memberships.map((m) => m.branch),
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  },

  /**
   * Create a new branch group
   */
  async createGroup(tenantId: string, name: string, description?: string | null) {
    const existing = await prisma.branchGroup.findFirst({
      where: { tenantId, name },
    });

    if (existing) {
      throw new ConflictError('Un groupe avec ce nom existe deja');
    }

    const group = await prisma.branchGroup.create({
      data: {
        tenantId,
        name,
        description: description ?? null,
      },
    });

    logger.info({ groupId: group.id, tenantId }, 'Branch group created');
    return group;
  },

  /**
   * Update a branch group
   */
  async updateGroup(groupId: string, tenantId: string, data: { name?: string; description?: string | null }) {
    const group = await prisma.branchGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.tenantId !== tenantId) {
      throw new NotFoundError('Groupe non trouve');
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== group.name) {
      const existing = await prisma.branchGroup.findFirst({
        where: { tenantId, name: data.name, id: { not: groupId } },
      });
      if (existing) {
        throw new ConflictError('Un groupe avec ce nom existe deja');
      }
    }

    const updated = await prisma.branchGroup.update({
      where: { id: groupId },
      data,
    });

    logger.info({ groupId }, 'Branch group updated');
    return updated;
  },

  /**
   * Delete a branch group (cascades to memberships)
   */
  async deleteGroup(groupId: string, tenantId: string) {
    const group = await prisma.branchGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.tenantId !== tenantId) {
      throw new NotFoundError('Groupe non trouve');
    }

    await prisma.branchGroup.delete({ where: { id: groupId } });
    logger.info({ groupId }, 'Branch group deleted');
  },

  /**
   * Add branches to a group
   */
  async addBranches(groupId: string, tenantId: string, branchIds: string[]) {
    const group = await prisma.branchGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.tenantId !== tenantId) {
      throw new NotFoundError('Groupe non trouve');
    }

    // Verify all branches belong to this tenant
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds }, tenantId },
      select: { id: true },
    });

    const validBranchIds = branches.map((b) => b.id);

    // Use createMany with skipDuplicates to avoid errors on existing memberships
    await prisma.branchGroupMembership.createMany({
      data: validBranchIds.map((branchId) => ({
        branchGroupId: groupId,
        branchId,
      })),
      skipDuplicates: true,
    });

    logger.info({ groupId, addedCount: validBranchIds.length }, 'Branches added to group');
    return { added: validBranchIds.length };
  },

  /**
   * Remove a branch from a group
   */
  async removeBranch(groupId: string, tenantId: string, branchId: string) {
    const group = await prisma.branchGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.tenantId !== tenantId) {
      throw new NotFoundError('Groupe non trouve');
    }

    await prisma.branchGroupMembership.delete({
      where: {
        branchGroupId_branchId: { branchGroupId: groupId, branchId },
      },
    }).catch(() => {
      // Silently ignore if membership doesn't exist
    });

    logger.info({ groupId, branchId }, 'Branch removed from group');
  },

  /**
   * Resolve a combination of branchIds and groupIds to a flat deduplicated list of branch IDs
   */
  async resolveBranchIds(
    tenantId: string,
    branchIds?: string[],
    groupIds?: string[]
  ): Promise<string[]> {
    const allBranchIds = new Set<string>(branchIds || []);

    if (groupIds && groupIds.length > 0) {
      const memberships = await prisma.branchGroupMembership.findMany({
        where: {
          branchGroupId: { in: groupIds },
          branchGroup: { tenantId },
        },
        select: { branchId: true },
      });

      for (const m of memberships) {
        allBranchIds.add(m.branchId);
      }
    }

    // Verify all branches belong to tenant
    if (allBranchIds.size > 0) {
      const validBranches = await prisma.branch.findMany({
        where: { id: { in: [...allBranchIds] }, tenantId },
        select: { id: true },
      });
      return validBranches.map((b) => b.id);
    }

    return [];
  },
};
