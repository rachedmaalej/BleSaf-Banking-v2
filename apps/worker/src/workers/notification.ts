import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { getBullMQRedisConnection } from '../lib/redis';
import { logger } from '../lib/logger';
import { config } from '../lib/config';
import { NOTIFICATION_STATUS, NotificationChannel, NotificationType } from '@blesaf/shared';

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

function formatMessage(template: string, data: Record<string, unknown>): string {
  let message = template;
  for (const [key, value] of Object.entries(data)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return message;
}

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

async function sendWhatsApp(
  recipient: string,
  messageType: NotificationType,
  templateData: Record<string, unknown>,
  _language: 'fr' | 'ar' = 'fr'
): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }> {
  // Try Meta Cloud API first
  if (config.WHATSAPP_PHONE_NUMBER_ID && config.WHATSAPP_ACCESS_TOKEN) {
    logger.info({ recipient, messageType }, 'Sending WhatsApp via Meta Cloud API');

    // Meta template sending (simplified - uses same text-based approach as Twilio fallback)
    // Full Meta template integration is handled by the API's whatsappService
  }

  // Fallback to Twilio WhatsApp
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_PHONE_NUMBER) {
    logger.warn('Neither Meta nor Twilio configured for WhatsApp');
    return { success: false, error: 'No WhatsApp provider configured' };
  }

  try {
    const twilio = await import('twilio');
    const client = twilio.default(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

    const template = SMS_TEMPLATES[messageType]['fr'];
    const message = formatMessage(template, templateData);

    const whatsappRecipient = recipient.startsWith('whatsapp:') ? recipient : `whatsapp:${recipient}`;
    const whatsappFrom = config.TWILIO_PHONE_NUMBER.startsWith('whatsapp:')
      ? config.TWILIO_PHONE_NUMBER
      : `whatsapp:${config.TWILIO_PHONE_NUMBER}`;

    const result = await client.messages.create({
      body: message,
      to: whatsappRecipient,
      from: whatsappFrom,
    });

    logger.info({ messageId: result.sid, recipient, messageType }, 'WhatsApp sent via Twilio');
    return { success: true, messageId: result.sid, provider: 'twilio' };
  } catch (error) {
    logger.error({ error, recipient, messageType }, 'Failed to send WhatsApp via Twilio');
    return { success: false, error: (error as Error).message };
  }
}

let worker: Worker<NotificationJobData> | null = null;

export function startNotificationWorker(): Worker<NotificationJobData> {
  if (worker) {
    logger.warn('Notification worker already running');
    return worker;
  }

  worker = new Worker<NotificationJobData>(
    'notifications',
    async (job: Job<NotificationJobData>) => {
      const { ticketId, messageType, channel, recipient, templateData } = job.data;

      logger.info({ jobId: job.id, ticketId, messageType, channel }, 'Processing notification');

      let result: { success: boolean; messageId?: string; error?: string; channel?: string; provider?: string };

      if (channel === 'whatsapp') {
        result = await sendWhatsApp(recipient, messageType, templateData);

        if (!result.success) {
          logger.info({ ticketId }, 'WhatsApp failed, falling back to SMS');
          result = await sendSMS(recipient, messageType, templateData);
          result.channel = 'sms';
          result.provider = 'twilio';
        } else {
          result.channel = 'whatsapp';
        }
      } else {
        result = await sendSMS(recipient, messageType, templateData);
        result.channel = 'sms';
        result.provider = 'twilio';
      }

      await prisma.notificationLog.create({
        data: {
          ticketId,
          channel: result.channel || channel,
          messageType,
          recipient,
          providerId: result.messageId || null,
          provider: result.provider || null,
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

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Notification job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Notification job failed');
  });

  logger.info('Notification worker started');
  return worker;
}

export async function stopNotificationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Notification worker stopped');
  }
}
