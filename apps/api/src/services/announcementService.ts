import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { emitAnnouncement, emitAnnouncementDismissed } from '../socket';
import { USER_ROLE, JWTPayload } from '@blesaf/shared';

interface CreateAnnouncementInput {
  branchId: string;
  message: string;
  messageAr?: string;
  priority?: 'normal' | 'urgent';
  enableTts?: boolean;
  displayDuration?: number;
  expiresAt?: Date;
}

export const announcementService = {
  /**
   * Create a new announcement and broadcast to displays
   */
  async create(data: CreateAnnouncementInput, userId: string, tenantId: string, user: JWTPayload) {
    // Verify branch belongs to tenant
    const branch = await prisma.branch.findUnique({
      where: { id: data.branchId },
      select: { id: true, tenantId: true, name: true },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    // Branch managers can only create announcements for their own branch
    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== data.branchId) {
      throw new ForbiddenError('Cannot create announcement for another branch');
    }

    // Validate message length
    if (data.message.length > 200) {
      throw new Error('Message cannot exceed 200 characters');
    }

    // Create the announcement
    const announcement = await prisma.announcement.create({
      data: {
        branchId: data.branchId,
        message: data.message,
        messageAr: data.messageAr,
        priority: data.priority || 'normal',
        enableTts: data.enableTts || false,
        displayDuration: data.displayDuration || 30,
        createdBy: userId,
        expiresAt: data.expiresAt,
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    // Emit socket event to branch and display rooms
    emitAnnouncement(data.branchId, {
      announcement: {
        id: announcement.id,
        message: announcement.message,
        messageAr: announcement.messageAr,
        priority: announcement.priority,
        enableTts: announcement.enableTts,
        displayDuration: announcement.displayDuration,
        createdBy: announcement.creator.name,
        createdAt: announcement.createdAt,
      },
    });

    return announcement;
  },

  /**
   * Get active (non-expired, non-dismissed) announcements for a branch
   */
  async getActive(branchId: string) {
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        branchId,
        dismissedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    return announcements;
  },

  /**
   * Get announcement history for a branch
   */
  async getHistory(branchId: string, limit: number = 20, tenantId: string, user: JWTPayload) {
    // Verify branch access
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { tenantId: true },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundError('Branch not found');
    }

    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== branchId) {
      throw new ForbiddenError('Cannot access announcements for another branch');
    }

    const announcements = await prisma.announcement.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    return announcements;
  },

  /**
   * Dismiss an announcement
   */
  async dismiss(announcementId: string, userId: string, tenantId: string, user: JWTPayload) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        branch: {
          select: { tenantId: true },
        },
      },
    });

    if (!announcement || announcement.branch.tenantId !== tenantId) {
      throw new NotFoundError('Announcement not found');
    }

    // Branch managers can only dismiss announcements for their own branch
    if (user.role === USER_ROLE.BRANCH_MANAGER && user.branchId !== announcement.branchId) {
      throw new ForbiddenError('Cannot dismiss announcement for another branch');
    }

    // Update the announcement
    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        dismissedBy: userId,
        dismissedAt: new Date(),
      },
    });

    // Emit socket event
    emitAnnouncementDismissed(announcement.branchId, announcementId);

    return updated;
  },

  /**
   * Get a single announcement by ID
   */
  async getById(announcementId: string, tenantId: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        branch: {
          select: { tenantId: true, name: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    if (!announcement || announcement.branch.tenantId !== tenantId) {
      throw new NotFoundError('Announcement not found');
    }

    return announcement;
  },
};
