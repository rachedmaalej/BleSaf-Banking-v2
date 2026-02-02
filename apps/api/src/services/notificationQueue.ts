import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { getBullMQRedisConnection } from '../lib/redis';
import { logger } from '../lib/logger';
import { config } from '../config';
import { NOTIFICATION_STATUS, NotificationChannel, NotificationType } from '@blesaf/shared';

// Notification job data
interface NotificationJobData {
  ticketId: string;
  messageType: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  templateData: Record<string, unknown>;
}

// SMS message templates
const SMS_TEMPLATES = {
  confirmation: {
    fr: '🎫 BléSaf — {{branchName}}\nVotre ticket: {{ticketNumber}}\nPosition: {{position}} | Attente: ~{{estimatedWait}} min\nService: {{serviceName}}',
    ar: '🎫 بلي ساف — {{branchName}}\nتذكرتك: {{ticketNumber}}\nالموقف: {{position}} | الانتظار: ~{{estimatedWait}} دقيقة\nالخدمة: {{serviceName}}',
  },
  almost_turn: {
    fr: '⏰ BléSaf — Plus que {{remaining}} client(s) avant vous! Merci de vous rapprocher du guichet.',
    ar: '⏰ بلي ساف — باقي {{remaining}} عميل قبلك! يرجى الاقتراب من الشباك.',
  },
  your_turn: {
    fr: '🔔 BléSaf — CEST VOTRE TOUR! Présentez-vous au Guichet {{counterNumber}}',
    ar: '🔔 بلي ساف — جاء دورك! تفضل للشباك {{counterNumber}}',
  },
} as const;

// Create notification queue
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

// Format message from template
function formatMessage(
  template: string,
  data: Record<string, unknown>
): string {
  let message = template;
  for (const [key, value] of Object.entries(data)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return message;
}

// Send SMS via Twilio
async function sendSMS(
  recipient: string,
  messageType: NotificationType,
  templateData: Record<string, unknown>,
  language: 'fr' | 'ar' = 'fr'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_PHONE_NUMBER) {
    logger.warn('Twilio credentials not configured, skipping SMS');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    // Dynamic import of Twilio
    const twilio = await import('twilio');
    const client = twilio.default(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

    const template = SMS_TEMPLATES[messageType][language];
    const message = formatMessage(template, templateData);

    const result = await client.messages.create({
      body: message,
      to: recipient,
      from: config.TWILIO_PHONE_NUMBER,
    });

    logger.info({ messageId: result.sid, recipient, messageType }, 'SMS sent');

    return { success: true, messageId: result.sid };
  } catch (error) {
    logger.error({ error, recipient, messageType }, 'Failed to send SMS');
    return { success: false, error: (error as Error).message };
  }
}

// Send WhatsApp via Twilio
async function sendWhatsApp(
  recipient: string,
  messageType: NotificationType,
  templateData: Record<string, unknown>,
  language: 'fr' | 'ar' = 'fr'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_PHONE_NUMBER) {
    logger.warn('Twilio credentials not configured, skipping WhatsApp');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const twilio = await import('twilio');
    const client = twilio.default(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

    const template = SMS_TEMPLATES[messageType][language];
    const message = formatMessage(template, templateData);

    // WhatsApp requires 'whatsapp:' prefix
    const whatsappRecipient = recipient.startsWith('whatsapp:') ? recipient : `whatsapp:${recipient}`;
    const whatsappFrom = config.TWILIO_PHONE_NUMBER.startsWith('whatsapp:')
      ? config.TWILIO_PHONE_NUMBER
      : `whatsapp:${config.TWILIO_PHONE_NUMBER}`;

    const result = await client.messages.create({
      body: message,
      to: whatsappRecipient,
      from: whatsappFrom,
    });

    logger.info({ messageId: result.sid, recipient, messageType }, 'WhatsApp sent');

    return { success: true, messageId: result.sid };
  } catch (error) {
    logger.error({ error, recipient, messageType }, 'Failed to send WhatsApp');
    return { success: false, error: (error as Error).message };
  }
}

// Create worker to process notification jobs
const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { ticketId, messageType, channel, recipient, templateData } = job.data;

    logger.info({ jobId: job.id, ticketId, messageType, channel }, 'Processing notification');

    let result: { success: boolean; messageId?: string; error?: string; channel?: string };

    // Try primary channel
    if (channel === 'whatsapp') {
      result = await sendWhatsApp(recipient, messageType, templateData);

      // Fallback to SMS if WhatsApp fails
      if (!result.success) {
        logger.info({ ticketId }, 'WhatsApp failed, falling back to SMS');
        result = await sendSMS(recipient, messageType, templateData);
        result.channel = 'sms';
      } else {
        result.channel = 'whatsapp';
      }
    } else {
      result = await sendSMS(recipient, messageType, templateData);
      result.channel = 'sms';
    }

    // Log notification result
    await prisma.notificationLog.create({
      data: {
        ticketId,
        channel: result.channel || channel,
        messageType,
        recipient,
        providerId: result.messageId || null,
        status: result.success ? NOTIFICATION_STATUS.SENT : NOTIFICATION_STATUS.FAILED,
        errorMsg: result.error || null,
      },
    });

    if (!result.success) {
      throw new Error(result.error || 'Notification failed');
    }

    return result;
  },
  {
    connection: getBullMQRedisConnection(),
    concurrency: 5,
  }
);

// Worker event handlers
notificationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Notification job completed');
});

notificationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Notification job failed');
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
   * Close queue and worker
   */
  async close() {
    await notificationWorker.close();
    await notificationQueueInstance.close();
  },
};
