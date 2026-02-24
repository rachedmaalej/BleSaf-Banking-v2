import { prisma } from '../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../lib/errors';
import { logger } from '../lib/logger';
import { getRedisClient, REDIS_KEYS } from '../lib/redis';
import { auditService } from './auditService';
import { branchGroupService } from './branchGroupService';
import {
  CreateServiceTemplateInput,
  UpdateServiceTemplateInput,
  PaginationInput,
  IDENTITY_FIELDS,
} from '@blesaf/shared';
import type { IdentityField } from '@blesaf/shared';

export const templateService = {
  // ============================================================
  // LIST TEMPLATES
  // ============================================================

  async listTemplates(tenantId: string, pagination: PaginationInput, activeOnly = false) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const where: { tenantId: string; isActive?: boolean } = { tenantId };
    if (activeOnly) {
      where.isActive = true;
    }

    const [templates, total] = await Promise.all([
      prisma.serviceTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nameFr: 'asc' },
      }),
      prisma.serviceTemplate.count({ where }),
    ]);

    return {
      data: templates,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  // ============================================================
  // CREATE TEMPLATE
  // ============================================================

  async createTemplate(tenantId: string, data: CreateServiceTemplateInput, userId?: string) {
    // Check for duplicate name within tenant
    const existing = await prisma.serviceTemplate.findFirst({
      where: { tenantId, nameFr: data.nameFr },
    });

    if (existing) {
      throw new ConflictError('Un template avec ce nom existe deja');
    }

    const template = await prisma.serviceTemplate.create({
      data: {
        tenantId,
        nameAr: data.nameAr,
        nameFr: data.nameFr,
        prefix: data.prefix,
        icon: data.icon || null,
        priorityWeight: data.priorityWeight ?? 1,
        avgServiceTime: data.avgServiceTime ?? 10,
        descriptionFr: data.descriptionFr ?? null,
        descriptionAr: data.descriptionAr ?? null,
        serviceGroup: data.serviceGroup ?? null,
        subServicesFr: data.subServicesFr ?? [],
        subServicesAr: data.subServicesAr ?? [],
        displayOrder: data.displayOrder ?? 0,
        showOnKiosk: data.showOnKiosk ?? true,
        isActive: true,
        version: 1,
      },
    });

    if (userId) {
      await auditService.logChange({
        entityType: 'template',
        entityId: template.id,
        action: 'create',
        changedBy: userId,
        metadata: { nameFr: data.nameFr },
      });
    }

    logger.info({ templateId: template.id, tenantId }, 'Service template created');
    return template;
  },

  // ============================================================
  // GET TEMPLATE
  // ============================================================

  async getTemplate(templateId: string, tenantId: string) {
    const template = await prisma.serviceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.tenantId !== tenantId) {
      throw new NotFoundError('Template non trouve');
    }

    return template;
  },

  // ============================================================
  // UPDATE TEMPLATE
  // ============================================================

  async updateTemplate(
    templateId: string,
    tenantId: string,
    data: UpdateServiceTemplateInput,
    userId?: string
  ) {
    const template = await prisma.serviceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.tenantId !== tenantId) {
      throw new NotFoundError('Template non trouve');
    }

    // Check name uniqueness if being changed
    if (data.nameFr && data.nameFr !== template.nameFr) {
      const existing = await prisma.serviceTemplate.findFirst({
        where: { tenantId, nameFr: data.nameFr, id: { not: templateId } },
      });
      if (existing) {
        throw new ConflictError('Un template avec ce nom existe deja');
      }
    }

    // Detect identity field changes for auto-sync
    const identityChanges: Partial<Record<IdentityField, { old: unknown; new: unknown }>> = {};
    for (const field of IDENTITY_FIELDS) {
      if (data[field] !== undefined) {
        const oldVal = template[field];
        const newVal = data[field];
        // Use JSON.stringify for array comparison
        const changed = Array.isArray(oldVal) || Array.isArray(newVal)
          ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
          : oldVal !== newVal;
        if (changed) {
          identityChanges[field] = { old: oldVal, new: newVal };
        }
      }
    }

    const hasIdentityChanges = Object.keys(identityChanges).length > 0;

    // Build update data
    const updateData: Record<string, unknown> = {
      nameAr: data.nameAr,
      nameFr: data.nameFr,
      prefix: data.prefix,
      icon: data.icon,
      priorityWeight: data.priorityWeight,
      avgServiceTime: data.avgServiceTime,
      descriptionFr: data.descriptionFr,
      descriptionAr: data.descriptionAr,
      serviceGroup: data.serviceGroup,
      subServicesFr: data.subServicesFr,
      subServicesAr: data.subServicesAr,
      displayOrder: data.displayOrder,
      showOnKiosk: data.showOnKiosk,
    };

    // Increment version if identity fields changed
    if (hasIdentityChanges) {
      updateData.version = template.version + 1;
    }

    // Remove undefined values
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) delete updateData[key];
    }

    const updated = await prisma.serviceTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    // Log field-level changes
    if (userId) {
      await auditService.logFieldChanges('template', templateId, template, updateData, userId);
    }

    // Auto-sync identity field changes to linked services
    if (hasIdentityChanges) {
      const syncCount = await this._autoSyncIdentityFields(templateId, identityChanges, updated.version, userId);
      logger.info({ templateId, syncCount, version: updated.version }, 'Template identity fields auto-synced');

      // Invalidate deployment status cache
      try {
        const redis = getRedisClient();
        await redis.del(REDIS_KEYS.deploymentStatus(templateId));
        await redis.del(REDIS_KEYS.driftReport(tenantId));
      } catch { /* cache invalidation is best-effort */ }
    }

    logger.info({ templateId, hasIdentityChanges }, 'Service template updated');
    return updated;
  },

  /**
   * Auto-sync changed identity fields to all linked services where those fields aren't overridden
   */
  async _autoSyncIdentityFields(
    templateId: string,
    changes: Partial<Record<IdentityField, { old: unknown; new: unknown }>>,
    newVersion: number,
    userId?: string
  ): Promise<number> {
    // Get all linked services
    const linkedServices = await prisma.serviceCategory.findMany({
      where: { sourceTemplateId: templateId, isActive: true },
      select: { id: true, overriddenFields: true },
    });

    let syncCount = 0;
    const auditEntries: Array<{
      entityType: 'service';
      entityId: string;
      action: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
      changedBy: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const service of linkedServices) {
      const overridden = (service.overriddenFields as string[]) || [];
      const fieldsToUpdate: Record<string, unknown> = {};

      for (const [field, change] of Object.entries(changes)) {
        if (!overridden.includes(field)) {
          fieldsToUpdate[field] = change!.new;

          if (userId) {
            auditEntries.push({
              entityType: 'service',
              entityId: service.id,
              action: 'sync',
              field,
              oldValue: change!.old != null ? String(change!.old) : null,
              newValue: change!.new != null ? String(change!.new) : null,
              changedBy: userId,
              metadata: { sourceTemplateId: templateId, autoSync: true },
            });
          }
        }
      }

      if (Object.keys(fieldsToUpdate).length > 0) {
        fieldsToUpdate.templateVersion = newVersion;
        await prisma.serviceCategory.update({
          where: { id: service.id },
          data: fieldsToUpdate,
        });
        syncCount++;
      } else {
        // Even if no fields updated, update templateVersion if service has all fields overridden
        await prisma.serviceCategory.update({
          where: { id: service.id },
          data: { templateVersion: newVersion },
        });
      }
    }

    if (auditEntries.length > 0) {
      await auditService.logBulkChanges(auditEntries);
    }

    return syncCount;
  },

  // ============================================================
  // DELETE TEMPLATE (Soft delete - mark inactive)
  // ============================================================

  async deleteTemplate(templateId: string, tenantId: string) {
    const template = await prisma.serviceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.tenantId !== tenantId) {
      throw new NotFoundError('Template non trouve');
    }

    await prisma.serviceTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    logger.info({ templateId }, 'Service template deactivated');
  },

  // ============================================================
  // COPY TEMPLATES TO BRANCH
  // ============================================================

  async copyTemplatesToBranch(
    tenantId: string,
    branchId: string,
    templateIds: string[],
    userId?: string
  ) {
    // Verify branch belongs to tenant
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Agence non trouvee');
    }

    // Get templates
    const templates = await prisma.serviceTemplate.findMany({
      where: { id: { in: templateIds }, tenantId, isActive: true },
    });

    if (templates.length === 0) {
      throw new BadRequestError('Aucun template valide selectionne');
    }

    // Get existing services in branch (both active and inactive)
    const existingServices = await prisma.serviceCategory.findMany({
      where: { branchId },
      select: { id: true, prefix: true, nameFr: true, isActive: true },
    });
    const servicesByPrefix = new Map(existingServices.map((s) => [s.prefix, s]));

    // Create or reactivate services from templates
    let created = 0;
    let reactivated = 0;
    let skipped = 0;
    const createdServices = [];
    const skipReasons: Array<{ prefix: string; existingServiceName: string }> = [];

    for (const template of templates) {
      const existingService = servicesByPrefix.get(template.prefix);

      if (existingService) {
        if (existingService.isActive) {
          // Active service with same prefix - skip
          skipped++;
          skipReasons.push({ prefix: template.prefix, existingServiceName: existingService.nameFr });
          logger.info(
            { templateId: template.id, branchId, prefix: template.prefix },
            'Template skipped - active service with prefix already exists'
          );
        } else {
          // Inactive service with same prefix - reactivate and update with template data
          await prisma.serviceCategory.update({
            where: { id: existingService.id },
            data: {
              isActive: true,
              nameAr: template.nameAr,
              nameFr: template.nameFr,
              icon: template.icon,
              priorityWeight: template.priorityWeight,
              avgServiceTime: template.avgServiceTime,
              descriptionFr: template.descriptionFr,
              descriptionAr: template.descriptionAr,
              serviceGroup: template.serviceGroup,
              subServicesFr: template.subServicesFr,
              subServicesAr: template.subServicesAr,
              displayOrder: template.displayOrder,
              showOnKiosk: template.showOnKiosk,
              sourceTemplateId: template.id,
              templateVersion: template.version,
              overriddenFields: [],
            },
          });
          servicesByPrefix.set(template.prefix, { ...existingService, isActive: true, nameFr: template.nameFr });
          reactivated++;
          logger.info(
            { templateId: template.id, branchId, prefix: template.prefix, serviceId: existingService.id },
            'Inactive service reactivated and linked to template'
          );
        }
        continue;
      }

      // No existing service with this prefix - create new one
      const service = await prisma.serviceCategory.create({
        data: {
          branchId,
          nameAr: template.nameAr,
          nameFr: template.nameFr,
          prefix: template.prefix,
          icon: template.icon,
          priorityWeight: template.priorityWeight,
          avgServiceTime: template.avgServiceTime,
          descriptionFr: template.descriptionFr,
          descriptionAr: template.descriptionAr,
          serviceGroup: template.serviceGroup,
          subServicesFr: template.subServicesFr,
          subServicesAr: template.subServicesAr,
          displayOrder: template.displayOrder,
          showOnKiosk: template.showOnKiosk,
          sourceTemplateId: template.id,
          templateVersion: template.version,
          overriddenFields: [],
          isActive: true,
        },
      });

      servicesByPrefix.set(template.prefix, { id: service.id, prefix: service.prefix, isActive: true, nameFr: service.nameFr });
      createdServices.push(service);
      created++;
    }

    // Audit log for deploy
    if (userId) {
      await auditService.logChange({
        entityType: 'template',
        entityId: templateIds.join(','),
        action: 'deploy',
        changedBy: userId,
        metadata: { branchId, branchName: branch.name, created, reactivated, skipped },
      });
    }

    logger.info(
      { branchId, tenantId, created, reactivated, skipped },
      'Templates copied to branch'
    );

    return { created, reactivated, skipped, skipReasons, services: createdServices };
  },

  // ============================================================
  // BULK DEPLOY (to multiple branches/groups)
  // ============================================================

  async bulkDeploy(
    tenantId: string,
    templateIds: string[],
    branchIds?: string[],
    groupIds?: string[],
    userId?: string
  ) {
    // Resolve target branches
    const resolvedBranchIds = await branchGroupService.resolveBranchIds(tenantId, branchIds, groupIds);

    if (resolvedBranchIds.length === 0) {
      throw new BadRequestError('Aucune agence cible valide');
    }

    // Get branch names for the report
    const branches = await prisma.branch.findMany({
      where: { id: { in: resolvedBranchIds } },
      select: { id: true, name: true },
    });
    const branchNameMap = new Map(branches.map((b) => [b.id, b.name]));

    const results = [];
    const totals = { created: 0, reactivated: 0, skipped: 0 };

    for (const targetBranchId of resolvedBranchIds) {
      const result = await this.copyTemplatesToBranch(tenantId, targetBranchId, templateIds, userId);

      const branchResult = {
        branchId: targetBranchId,
        branchName: branchNameMap.get(targetBranchId) || 'Unknown',
        created: result.created,
        reactivated: result.reactivated,
        skipped: result.skipped,
        skipReasons: result.skipReasons,
      };

      results.push(branchResult);
      totals.created += result.created;
      totals.reactivated += result.reactivated;
      totals.skipped += result.skipped;
    }

    logger.info(
      { tenantId, templateCount: templateIds.length, branchCount: resolvedBranchIds.length, totals },
      'Bulk deploy completed'
    );

    return { results, totals };
  },

  // ============================================================
  // DEPLOYMENT STATUS
  // ============================================================

  async getDeploymentStatus(templateId: string, tenantId: string) {
    const template = await prisma.serviceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.tenantId !== tenantId) {
      throw new NotFoundError('Template non trouve');
    }

    // Check cache
    try {
      const redis = getRedisClient();
      const cached = await redis.get(REDIS_KEYS.deploymentStatus(templateId));
      if (cached) return JSON.parse(cached);
    } catch { /* cache miss, continue */ }

    // Total branches in tenant
    const totalBranches = await prisma.branch.count({
      where: { tenantId, status: 'active' },
    });

    // Linked services with branch info
    const linkedServices = await prisma.serviceCategory.findMany({
      where: { sourceTemplateId: templateId },
      select: {
        id: true,
        templateVersion: true,
        overriddenFields: true,
        isActive: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    let syncedCount = 0;
    let divergedCount = 0;
    let pendingSyncCount = 0;

    const branches = linkedServices.map((s) => {
      const overridden = (s.overriddenFields as string[]) || [];
      const isSynced = s.templateVersion === template.version;
      const isDiverged = overridden.length > 0;

      let status: 'synced' | 'pending_sync' | 'diverged';
      if (isDiverged) {
        status = 'diverged';
        divergedCount++;
      } else if (!isSynced) {
        status = 'pending_sync';
        pendingSyncCount++;
      } else {
        status = 'synced';
        syncedCount++;
      }

      return {
        branchId: s.branch.id,
        branchName: s.branch.name,
        branchCode: s.branch.code,
        serviceId: s.id,
        templateVersion: s.templateVersion || 0,
        currentVersion: template.version,
        overriddenFields: overridden,
        status,
      };
    });

    const result = {
      templateId,
      templateName: template.nameFr,
      templateVersion: template.version,
      totalBranches,
      deployedCount: linkedServices.length,
      syncedCount,
      divergedCount,
      pendingSyncCount,
      branches,
    };

    // Cache for 60 seconds
    try {
      const redis = getRedisClient();
      await redis.set(REDIS_KEYS.deploymentStatus(templateId), JSON.stringify(result), 'EX', 60);
    } catch { /* cache write is best-effort */ }

    return result;
  },

  // ============================================================
  // DRIFT REPORT
  // ============================================================

  async getDriftReport(tenantId: string, templateId?: string) {
    // Check cache (only for tenant-wide reports)
    if (!templateId) {
      try {
        const redis = getRedisClient();
        const cached = await redis.get(REDIS_KEYS.driftReport(tenantId));
        if (cached) return JSON.parse(cached);
      } catch { /* cache miss */ }
    }

    const where: Record<string, unknown> = {
      sourceTemplateId: { not: null },
      branch: { tenantId },
    };

    if (templateId) {
      where.sourceTemplateId = templateId;
    }

    const services = await prisma.serviceCategory.findMany({
      where,
      select: {
        id: true,
        nameFr: true,
        nameAr: true,
        icon: true,
        descriptionFr: true,
        descriptionAr: true,
        serviceGroup: true,
        subServicesFr: true,
        subServicesAr: true,
        overriddenFields: true,
        sourceTemplate: {
          select: { id: true, nameFr: true, nameAr: true, icon: true, descriptionFr: true, descriptionAr: true, serviceGroup: true, subServicesFr: true, subServicesAr: true },
        },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    const report = services
      .filter((s) => {
        const overridden = (s.overriddenFields as string[]) || [];
        return overridden.length > 0;
      })
      .map((s) => {
        const overridden = (s.overriddenFields as string[]) || [];
        const fieldDiffs = overridden
          .map((field) => {
            const serviceValue = (s as Record<string, unknown>)[field];
            const templateValue = s.sourceTemplate
              ? (s.sourceTemplate as Record<string, unknown>)[field]
              : null;
            const stringify = (v: unknown) => Array.isArray(v) ? JSON.stringify(v) : (v != null ? String(v) : '');
            return {
              field,
              templateValue: stringify(templateValue),
              branchValue: stringify(serviceValue),
            };
          })
          .filter((d) => d.templateValue !== d.branchValue);

        return {
          serviceId: s.id,
          branchId: s.branch.id,
          branchName: s.branch.name,
          branchCode: s.branch.code,
          templateName: s.sourceTemplate?.nameFr || 'Unknown',
          overriddenFields: overridden,
          fieldDiffs,
        };
      });

    // Cache tenant-wide reports for 120 seconds
    if (!templateId) {
      try {
        const redis = getRedisClient();
        await redis.set(REDIS_KEYS.driftReport(tenantId), JSON.stringify(report), 'EX', 120);
      } catch { /* cache write is best-effort */ }
    }

    return report;
  },

  // ============================================================
  // MANUAL SYNC (push template changes to linked services)
  // ============================================================

  async syncTemplate(templateId: string, tenantId: string, userId: string, force = false) {
    const template = await prisma.serviceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.tenantId !== tenantId) {
      throw new NotFoundError('Template non trouve');
    }

    const linkedServices = await prisma.serviceCategory.findMany({
      where: { sourceTemplateId: templateId },
      select: { id: true, overriddenFields: true, templateVersion: true },
    });

    let syncCount = 0;

    for (const service of linkedServices) {
      const overridden = force ? [] : ((service.overriddenFields as string[]) || []);
      const fieldsToUpdate: Record<string, unknown> = { templateVersion: template.version };

      for (const field of IDENTITY_FIELDS) {
        if (!overridden.includes(field)) {
          fieldsToUpdate[field] = template[field];
        }
      }

      // If force sync, also clear the overriddenFields
      if (force) {
        fieldsToUpdate.overriddenFields = [];
      }

      await prisma.serviceCategory.update({
        where: { id: service.id },
        data: fieldsToUpdate,
      });
      syncCount++;
    }

    await auditService.logChange({
      entityType: 'template',
      entityId: templateId,
      action: 'sync',
      changedBy: userId,
      metadata: { syncCount, force },
    });

    // Invalidate caches
    try {
      const redis = getRedisClient();
      await redis.del(REDIS_KEYS.deploymentStatus(templateId));
      await redis.del(REDIS_KEYS.driftReport(tenantId));
    } catch { /* best-effort */ }

    logger.info({ templateId, syncCount, force }, 'Template manually synced');
    return { syncCount };
  },

  // ============================================================
  // RESET SERVICE FIELD (remove override, revert to template)
  // ============================================================

  async resetServiceField(
    serviceId: string,
    field: IdentityField,
    tenantId: string,
    userId: string
  ) {
    const service = await prisma.serviceCategory.findUnique({
      where: { id: serviceId },
      include: {
        branch: { select: { tenantId: true } },
        sourceTemplate: true,
      },
    });

    if (!service || service.branch.tenantId !== tenantId) {
      throw new NotFoundError('Service non trouve');
    }

    if (!service.sourceTemplateId || !service.sourceTemplate) {
      throw new BadRequestError('Ce service n\'est pas lie a un template');
    }

    const overridden = (service.overriddenFields as string[]) || [];
    if (!overridden.includes(field)) {
      throw new BadRequestError(`Le champ "${field}" n'est pas surcharge`);
    }

    // Remove field from overriddenFields and revert to template value
    const newOverridden = overridden.filter((f) => f !== field);
    const templateValue = service.sourceTemplate[field as keyof typeof service.sourceTemplate];

    await prisma.serviceCategory.update({
      where: { id: serviceId },
      data: {
        [field]: templateValue,
        overriddenFields: newOverridden,
      },
    });

    await auditService.logChange({
      entityType: 'service',
      entityId: serviceId,
      action: 'update',
      field,
      oldValue: String((service as Record<string, unknown>)[field] ?? ''),
      newValue: String(templateValue ?? ''),
      changedBy: userId,
      metadata: { resetToTemplate: true },
    });

    logger.info({ serviceId, field }, 'Service field reset to template value');
    return { field, newValue: templateValue };
  },
};
