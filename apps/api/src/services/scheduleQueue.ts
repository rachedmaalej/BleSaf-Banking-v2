import { Queue, Worker, Job } from 'bullmq';
import { getBullMQRedisConnection } from '../lib/redis';
import { logger } from '../lib/logger';

// Schedule job data
export interface ScheduleJobData {
  branchId: string;
  action: 'open' | 'close';
  scheduledTime: string; // ISO timestamp
}

// Create schedule queue
const scheduleQueueInstance = new Queue<ScheduleJobData>('schedule', {
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

// Worker instance - will be initialized when startWorker is called
let scheduleWorker: Worker<ScheduleJobData> | null = null;

/**
 * Start the schedule worker
 * This must be called after scheduleService is defined to avoid circular imports
 */
export function startScheduleWorker(
  processJob: (job: Job<ScheduleJobData>) => Promise<void>
) {
  if (scheduleWorker) {
    logger.warn('Schedule worker already running');
    return;
  }

  scheduleWorker = new Worker<ScheduleJobData>(
    'schedule',
    async (job: Job<ScheduleJobData>) => {
      const { branchId, action, scheduledTime } = job.data;
      logger.info({ jobId: job.id, branchId, action, scheduledTime }, 'Processing schedule job');
      await processJob(job);
    },
    {
      connection: getBullMQRedisConnection(),
      concurrency: 5,
    }
  );

  // Worker event handlers
  scheduleWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, action: job.data.action, branchId: job.data.branchId }, 'Schedule job completed');
  });

  scheduleWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message, action: job?.data.action }, 'Schedule job failed');
  });

  logger.info('Schedule worker started');
}

export const scheduleQueue = {
  /**
   * Schedule a queue open/close job
   * Uses cron-like repeat pattern for daily execution
   */
  async scheduleDaily(
    branchId: string,
    action: 'open' | 'close',
    time: string, // "HH:mm" format
    timezone: string
  ): Promise<string | undefined> {
    // Parse time
    const [hours, minutes] = time.split(':').map(Number);

    // Create unique job ID for this branch/action combination
    const jobId = `branch:${branchId}:${action}`;

    // Remove existing job with same ID if exists
    await this.removeScheduledJob(branchId, action);

    // Schedule with cron pattern (minute hour * * *)
    // BullMQ uses cron format: minute hour day-of-month month day-of-week
    const cronPattern = `${minutes} ${hours} * * *`;

    const job = await scheduleQueueInstance.add(
      action,
      {
        branchId,
        action,
        scheduledTime: new Date().toISOString(),
      },
      {
        jobId,
        repeat: {
          pattern: cronPattern,
          tz: timezone,
        },
      }
    );

    logger.info(
      { jobId, branchId, action, time, timezone, cronPattern },
      'Scheduled daily job'
    );

    return job.id;
  },

  /**
   * Remove a scheduled job
   */
  async removeScheduledJob(branchId: string, action: 'open' | 'close'): Promise<void> {
    const jobId = `branch:${branchId}:${action}`;

    try {
      // Remove repeatable job by key
      const repeatableJobs = await scheduleQueueInstance.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.id === jobId) {
          await scheduleQueueInstance.removeRepeatableByKey(job.key);
          logger.info({ jobId, branchId, action }, 'Removed scheduled job');
        }
      }
    } catch (error) {
      logger.warn({ error, jobId }, 'Failed to remove scheduled job (may not exist)');
    }
  },

  /**
   * Remove all scheduled jobs for a branch
   */
  async removeAllBranchJobs(branchId: string): Promise<void> {
    await this.removeScheduledJob(branchId, 'open');
    await this.removeScheduledJob(branchId, 'close');
  },

  /**
   * Get next scheduled times for a branch
   */
  async getNextScheduledTimes(branchId: string): Promise<{
    nextOpen: Date | null;
    nextClose: Date | null;
  }> {
    const repeatableJobs = await scheduleQueueInstance.getRepeatableJobs();

    let nextOpen: Date | null = null;
    let nextClose: Date | null = null;

    for (const job of repeatableJobs) {
      if (job.id === `branch:${branchId}:open` && job.next) {
        nextOpen = new Date(job.next);
      }
      if (job.id === `branch:${branchId}:close` && job.next) {
        nextClose = new Date(job.next);
      }
    }

    return { nextOpen, nextClose };
  },

  /**
   * Add an immediate job (for manual trigger or missed schedule)
   */
  async addImmediateJob(branchId: string, action: 'open' | 'close'): Promise<string | undefined> {
    const job = await scheduleQueueInstance.add(
      `${action}-immediate`,
      {
        branchId,
        action,
        scheduledTime: new Date().toISOString(),
      },
      {
        priority: 1, // High priority
      }
    );

    logger.info({ jobId: job.id, branchId, action }, 'Added immediate schedule job');

    return job.id;
  },

  /**
   * Get queue stats
   */
  async getStats() {
    const [waiting, active, completed, failed, repeatableJobs] = await Promise.all([
      scheduleQueueInstance.getWaitingCount(),
      scheduleQueueInstance.getActiveCount(),
      scheduleQueueInstance.getCompletedCount(),
      scheduleQueueInstance.getFailedCount(),
      scheduleQueueInstance.getRepeatableJobs(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      scheduledJobs: repeatableJobs.length,
    };
  },

  /**
   * Close queue and worker
   */
  async close(): Promise<void> {
    if (scheduleWorker) {
      await scheduleWorker.close();
      scheduleWorker = null;
    }
    await scheduleQueueInstance.close();
    logger.info('Schedule queue closed');
  },
};
