import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { ENTITY_STATUS } from '@blesaf/shared';

// Profile presets for counter counts
const PROFILE_PRESETS: Record<string, number> = {
  small: 2,
  medium: 4,
  large: 8,
};

export interface BatchBranchRow {
  name: string;
  code: string;
  address?: string;
  region?: string;
  phone?: string;
  profile?: string; // 'small' | 'medium' | 'large' | 'custom'
  counterCount?: number; // Required if profile is 'custom'
  services?: string; // Comma-separated template prefixes (e.g., "R,C,X")
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidatedRow extends BatchBranchRow {
  rowNumber: number;
  templateIds: string[];
  resolvedCounterCount: number;
}

export interface BatchValidationResult {
  valid: ValidatedRow[];
  errors: ValidationError[];
}

export interface BatchImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export const batchImportService = {
  /**
   * Validate CSV data without creating anything
   */
  async validateBatch(
    tenantId: string,
    rows: BatchBranchRow[]
  ): Promise<BatchValidationResult> {
    const valid: ValidatedRow[] = [];
    const errors: ValidationError[] = [];

    // Get existing branch codes for duplicate check
    const existingBranches = await prisma.branch.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const existingCodes = new Set(existingBranches.map((b) => b.code.toUpperCase()));

    // Get all active templates for service resolution
    const templates = await prisma.serviceTemplate.findMany({
      where: { tenantId, isActive: true },
    });
    const templatesByPrefix = new Map(templates.map((t) => [t.prefix, t]));

    // Track codes being added in this batch to detect duplicates within batch
    const batchCodes = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!; // Non-null assertion since we're iterating within bounds
      const rowNumber = i + 2; // +2 because row 1 is header, 0-indexed
      let hasError = false;

      // Validate required fields
      if (!row.name || row.name.trim().length < 2) {
        errors.push({
          row: rowNumber,
          field: 'name',
          message: 'Le nom doit contenir au moins 2 caracteres',
        });
        hasError = true;
      }

      if (!row.code || row.code.trim().length < 2) {
        errors.push({
          row: rowNumber,
          field: 'code',
          message: 'Le code est requis (min 2 caracteres)',
        });
        hasError = true;
      } else {
        const normalizedCode = row.code.toUpperCase().trim();

        // Check code format
        if (!/^[A-Z0-9-]+$/.test(normalizedCode)) {
          errors.push({
            row: rowNumber,
            field: 'code',
            message: 'Le code doit contenir uniquement des majuscules, chiffres et tirets',
          });
          hasError = true;
        }

        // Check for duplicate in existing branches
        if (existingCodes.has(normalizedCode)) {
          errors.push({
            row: rowNumber,
            field: 'code',
            message: `Le code "${normalizedCode}" existe deja`,
          });
          hasError = true;
        }

        // Check for duplicate within batch
        if (batchCodes.has(normalizedCode)) {
          errors.push({
            row: rowNumber,
            field: 'code',
            message: `Le code "${normalizedCode}" est duplique dans le fichier`,
          });
          hasError = true;
        }

        batchCodes.add(normalizedCode);
      }

      // Validate and resolve profile/counter count
      let resolvedCounterCount = 4; // Default
      if (row.profile) {
        const profile = row.profile.toLowerCase().trim();
        if (profile === 'custom') {
          if (!row.counterCount || row.counterCount < 1 || row.counterCount > 50) {
            errors.push({
              row: rowNumber,
              field: 'counterCount',
              message: 'Avec le profil "custom", le nombre de guichets est requis (1-50)',
            });
            hasError = true;
          } else {
            resolvedCounterCount = row.counterCount;
          }
        } else if (PROFILE_PRESETS[profile]) {
          resolvedCounterCount = PROFILE_PRESETS[profile];
        } else {
          errors.push({
            row: rowNumber,
            field: 'profile',
            message: `Profil invalide: "${profile}". Utilisez: small, medium, large, custom`,
          });
          hasError = true;
        }
      } else if (row.counterCount) {
        if (row.counterCount < 1 || row.counterCount > 50) {
          errors.push({
            row: rowNumber,
            field: 'counterCount',
            message: 'Le nombre de guichets doit etre entre 1 et 50',
          });
          hasError = true;
        } else {
          resolvedCounterCount = row.counterCount;
        }
      }

      // Validate and resolve services
      let templateIds: string[] = [];
      if (row.services) {
        const prefixes = row.services
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);

        if (prefixes.length === 0) {
          errors.push({
            row: rowNumber,
            field: 'services',
            message: 'Au moins un service est requis',
          });
          hasError = true;
        } else {
          for (const prefix of prefixes) {
            const template = templatesByPrefix.get(prefix);
            if (!template) {
              errors.push({
                row: rowNumber,
                field: 'services',
                message: `Service avec prefixe "${prefix}" non trouve`,
              });
              hasError = true;
            } else {
              templateIds.push(template.id);
            }
          }
        }
      } else {
        // If no services specified, use all templates
        templateIds = templates.map((t) => t.id);
        if (templateIds.length === 0) {
          errors.push({
            row: rowNumber,
            field: 'services',
            message: 'Aucun template de service disponible. Creez des templates d\'abord.',
          });
          hasError = true;
        }
      }

      if (!hasError) {
        valid.push({
          ...row,
          rowNumber,
          templateIds,
          resolvedCounterCount,
        });
      }
    }

    return { valid, errors };
  },

  /**
   * Import validated branches
   */
  async importBatch(
    tenantId: string,
    rows: ValidatedRow[],
    skipErrors: boolean = true
  ): Promise<BatchImportResult> {
    let created = 0;
    let skipped = 0;
    const importErrors: Array<{ row: number; error: string }> = [];

    // Get templates for service creation
    const templates = await prisma.serviceTemplate.findMany({
      where: { tenantId, isActive: true },
    });
    const templatesById = new Map(templates.map((t) => [t.id, t]));

    for (const row of rows) {
      try {
        // Create branch with services and counters in a transaction
        await prisma.$transaction(async (tx) => {
          // 1. Create branch
          const branch = await tx.branch.create({
            data: {
              tenantId,
              name: row.name.trim(),
              code: row.code.toUpperCase().trim(),
              address: row.address?.trim() || null,
              region: row.region?.trim() || null,
              timezone: 'Africa/Tunis',
              notifyAtPosition: 2,
              status: ENTITY_STATUS.ACTIVE,
            },
          });

          // 2. Create services from templates
          const services = await Promise.all(
            row.templateIds.map((templateId) => {
              const template = templatesById.get(templateId);
              if (!template) throw new Error(`Template ${templateId} not found`);

              return tx.serviceCategory.create({
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
              });
            })
          );

          const serviceIds = services.map((s) => s.id);

          // 3. Create counters
          await Promise.all(
            Array.from({ length: row.resolvedCounterCount }, (_, i) =>
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
        });

        created++;
        logger.info(
          { tenantId, branchCode: row.code, row: row.rowNumber },
          'Branch created via batch import'
        );
      } catch (err: any) {
        const errorMessage = err.message || 'Unknown error';
        importErrors.push({ row: row.rowNumber, error: errorMessage });

        if (!skipErrors) {
          throw err;
        }

        skipped++;
        logger.warn(
          { tenantId, branchCode: row.code, row: row.rowNumber, error: errorMessage },
          'Branch skipped due to error'
        );
      }
    }

    logger.info(
      { tenantId, created, skipped, errors: importErrors.length },
      'Batch import completed'
    );

    return { created, skipped, errors: importErrors };
  },

  /**
   * Generate CSV template for download
   */
  generateCsvTemplate(): string {
    const headers = ['name', 'code', 'address', 'region', 'profile', 'counterCount', 'services'];
    const exampleRows = [
      ['Agence La Marsa', 'LM01', '45 Rue Habib Bourguiba, La Marsa', 'Tunis', 'medium', '', 'R,C,X'],
      ['Agence Sousse', 'SS01', '12 Avenue Bourguiba, Sousse', 'Sousse', 'large', '', 'R,C,X,B'],
      ['Agence Sfax', 'SF01', '8 Rue de la Liberte, Sfax', 'Sfax', 'small', '', 'R,C'],
      ['Agence Bizerte', 'BZ01', '15 Avenue de la Republique', 'Bizerte', 'custom', '6', 'R,C,X'],
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  },
};
