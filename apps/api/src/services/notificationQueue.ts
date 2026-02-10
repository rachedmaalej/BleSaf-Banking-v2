import { Queue } from 'bullmq';
import { getBullMQRedisConnection } from '../lib/redis';
import { logger } from '../lib/logger';
import { NotificationChannel, NotificationType } from '@blesaf/shared';

// Notification job data
interface NotificationJobData {
  ticketId: string;
  messageType: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  templateData: Record<string, unknown>;
}

// Create notification queue (producer side only — worker runs in apps/worker)
const notificationQueueInstance = new Queue<NotificationJobData>('notifications', {
  connection: getBullMQRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

export const notificationQueue = {
  /**
   * Add notification to queue
   */
  async queueNotification(data: NotificationJobData) {
    const job = await notificationQueueInstance.add('send', data, {
      priority: data.messageType === 'your_turn' ? 1 : 2,
    });

    logger.info(
      { jobId: job.id, ticketId: data.ticketId, messageType: data.messageType },
      'Notification queued'
    );

    return job.id;
  },

  /**
   * Get queue stats
   */
  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      notificationQueueInstance.getWaitingCount(),
      notificationQueueInstance.getActiveCount(),
      notificationQueueInstance.getCompletedCount(),
      notificationQueueInstance.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  },

  /**
   * Close queue
   */
  async close() {
    await notificationQueueInstance.close();
  },
};
