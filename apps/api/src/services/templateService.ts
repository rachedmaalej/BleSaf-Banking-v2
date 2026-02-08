import { prisma } from '../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../lib/errors';
import { logger } from '../lib/logger';
import {
  CreateServiceTemplateInput,
  UpdateServiceTemplateInput,
  PaginationInput,
} from '@blesaf/shared';

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

  async createTemplate(tenantId: string, data: CreateServiceTemplateInput) {
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
        isActive: true,
      },
    });

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
    data: UpdateServiceTemplateInput
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

    const updated = await prisma.serviceTemplate.update({
      where: { id: templateId },
      data: {
        nameAr: data.nameAr,
        nameFr: data.nameFr,
        prefix: data.prefix,
        icon: data.icon,
        priorityWeight: data.priorityWeight,
        avgServiceTime: data.avgServiceTime,
      },
    });

    logger.info({ templateId }, 'Service template updated');
    return updated;
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
    templateIds: string[]
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
      select: { id: true, prefix: true, isActive: true },
    });
    const servicesByPrefix = new Map(existingServices.map((s) => [s.prefix, s]));

    // Create or reactivate services from templates
    let created = 0;
    let reactivated = 0;
    let skipped = 0;
    const createdServices = [];

    for (const template of templates) {
      const existingService = servicesByPrefix.get(template.prefix);

      if (existingService) {
        if (existingService.isActive) {
          // Active service with same prefix - skip
          skipped++;
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
            },
          });
          // Update the map to reflect it's now active (prevents double-counting if another template has same prefix)
          servicesByPrefix.set(template.prefix, { ...existingService, isActive: true });
          reactivated++;
          logger.info(
            { templateId: template.id, branchId, prefix: template.prefix, serviceId: existingService.id },
            'Inactive service reactivated and updated with template data'
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
          isActive: true,
        },
      });

      servicesByPrefix.set(template.prefix, { id: service.id, prefix: service.prefix, isActive: true });
      createdServices.push(service);
      created++;
    }

    logger.info(
      { branchId, tenantId, created, reactivated, skipped },
      'Templates copied to branch'
    );

    return { created, reactivated, skipped, services: createdServices };
  },
};
