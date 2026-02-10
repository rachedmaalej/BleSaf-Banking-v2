import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

interface ChangeLogEntry {
  entityType: 'template' | 'service';
  entityId: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy: string;
  metadata?: Record<string, unknown> | null;
}

export const auditService = {
  /**
   * Log a single change to the ServiceChangeLog
   */
  async logChange(entry: ChangeLogEntry) {
    try {
      await prisma.serviceChangeLog.create({
        data: {
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          field: entry.field ?? null,
          oldValue: entry.oldValue ?? null,
          newValue: entry.newValue ?? null,
          changedBy: entry.changedBy,
          metadata: entry.metadata ?? null,
        },
      });
    } catch (err) {
      // Audit logging should never break the main operation
      logger.error({ err, entry }, 'Failed to write audit log');
    }
  },

  /**
   * Log multiple changes in a batch (e.g., template sync affecting many services)
   */
  async logBulkChanges(entries: ChangeLogEntry[]) {
    if (entries.length === 0) return;

    try {
      await prisma.serviceChangeLog.createMany({
        data: entries.map((entry) => ({
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          field: entry.field ?? null,
          oldValue: entry.oldValue ?? null,
          newValue: entry.newValue ?? null,
          changedBy: entry.changedBy,
          metadata: entry.metadata ?? null,
        })),
      });
    } catch (err) {
      logger.error({ err, count: entries.length }, 'Failed to write bulk audit logs');
    }
  },

  /**
   * Log field-level changes by comparing old and new values
   */
  async logFieldChanges(
    entityType: 'template' | 'service',
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    changedBy: string,
    metadata?: Record<string, unknown> | null
  ) {
    const entries: ChangeLogEntry[] = [];

    for (const [field, newValue] of Object.entries(newValues)) {
      if (newValue === undefined) continue;
      const oldValue = oldValues[field];
      if (String(oldValue ?? '') !== String(newValue ?? '')) {
        entries.push({
          entityType,
          entityId,
          action: 'update',
          field,
          oldValue: oldValue != null ? String(oldValue) : null,
          newValue: newValue != null ? String(newValue) : null,
          changedBy,
          metadata,
        });
      }
    }

    if (entries.length > 0) {
      await this.logBulkChanges(entries);
    }

    return entries.length;
  },

  /**
   * Get paginated change history for a specific entity
   */
  async getHistory(
    entityType: 'template' | 'service',
    entityId: string,
    page: number = 1,
    pageSize: number = 20
  ) {
    const skip = (page - 1) * pageSize;

    const [entries, total] = await Promise.all([
      prisma.serviceChangeLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.serviceChangeLog.count({ where: { entityType, entityId } }),
    ]);

    return {
      data: entries,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
};
