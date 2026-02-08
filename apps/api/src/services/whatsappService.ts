import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { NotificationType } from '@blesaf/shared';

const META_API_BASE = 'https://graph.facebook.com/v18.0';

// WhatsApp template names registered in Meta Business Manager
const TEMPLATE_NAMES: Record<NotificationType, { fr: string; ar: string }> = {
  confirmation: { fr: 'blesaf_confirm_fr', ar: 'blesaf_confirm_ar' },
  almost_turn: { fr: 'blesaf_almost_fr', ar: 'blesaf_almost_ar' },
  your_turn: { fr: 'blesaf_turn_fr', ar: 'blesaf_turn_ar' },
};

// Template component mappings for each message type
interface TemplateComponent {
  type: 'body';
  parameters: { type: 'text'; text: string }[];
}

function buildTemplateComponents(
  messageType: NotificationType,
  data: Record<string, unknown>
): TemplateComponent[] {
  switch (messageType) {
    case 'confirmation':
      // Template: BléSaf - {{1}}\nTicket: {{2}}\nPosition: {{3}} | ~{{4}} min
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(data.branchName || '') },
            { type: 'text', text: String(data.ticketNumber || '') },
            { type: 'text', text: String(data.position || '') },
            { type: 'text', text: String(data.estimatedWait || '') },
          ],
        },
      ];

    case 'almost_turn':
      // Template: BléSaf - Plus que {{1}} client(s) avant vous!
      return [
        {
          type: 'body',
          parameters: [{ type: 'text', text: String(data.remaining || '') }],
        },
      ];

    case 'your_turn':
      // Template: BléSaf - C'EST VOTRE TOUR! Guichet {{1}}
      return [
        {
          type: 'body',
          parameters: [{ type: 'text', text: String(data.counterNumber || '') }],
        },
      ];

    default:
      return [];
  }
}

/**
 * Check if Meta WhatsApp is configured
 */
export function isMetaConfigured(): boolean {
  return Boolean(config.WHATSAPP_PHONE_NUMBER_ID && config.WHATSAPP_ACCESS_TOKEN);
}

/**
 * Send WhatsApp template message via Meta Cloud API
 */
export async function sendTemplate(
  recipientPhone: string,
  messageType: NotificationType,
  templateData: Record<string, unknown>,
  language: 'fr' | 'ar' = 'fr'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isMetaConfigured()) {
    logger.warn('Meta WhatsApp credentials not configured');
    return { success: false, error: 'Meta WhatsApp not configured' };
  }

  try {
    // Format phone number (remove + prefix if present, Meta expects without +)
    const formattedPhone = recipientPhone.replace(/^\+/, '');

    const templateName = TEMPLATE_NAMES[messageType][language];
    const components = buildTemplateComponents(messageType, templateData);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language === 'ar' ? 'ar' : 'fr',
        },
        components,
      },
    };

    const response = await fetch(
      `${META_API_BASE}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json() as { messages?: { id: string }[]; error?: { message: string; code: number } };

    if (!response.ok) {
      logger.error(
        { statusCode: response.status, error: result.error, recipient: formattedPhone },
        'Meta WhatsApp API error'
      );
      return {
        success: false,
        error: result.error?.message || `API error: ${response.status}`,
      };
    }

    const messageId = result.messages?.[0]?.id;

    logger.info(
      { messageId, recipient: formattedPhone, messageType, template: templateName },
      'WhatsApp template sent via Meta'
    );

    return { success: true, messageId };
  } catch (error) {
    logger.error({ error, recipient: recipientPhone, messageType }, 'Failed to send WhatsApp via Meta');
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Verify webhook signature from Meta
 */
export function verifyWebhookSignature(signature: string, body: string): boolean {
  if (!config.WHATSAPP_WEBHOOK_SECRET) {
    logger.warn('WHATSAPP_WEBHOOK_SECRET not configured, skipping verification');
    return true; // Allow in dev mode without secret
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.WHATSAPP_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expectedSignature}`),
    Buffer.from(signature)
  );
}

/**
 * Handle webhook payload from Meta (delivery status updates)
 */
export async function handleWebhook(payload: MetaWebhookPayload): Promise<void> {
  try {
    // Process each entry
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Process status updates
        for (const status of value.statuses || []) {
          const { id: wamid, status: deliveryStatus, timestamp } = status;

          // Find notification log by provider ID (wamid)
          const notification = await prisma.notificationLog.findFirst({
            where: { providerId: wamid, provider: 'meta' },
          });

          if (!notification) {
            logger.debug({ wamid, deliveryStatus }, 'No notification found for status update');
            continue;
          }

          // Update notification log based on status
          const updateData: Record<string, unknown> = {
            deliveryStatus,
            updatedAt: new Date(),
          };

          switch (deliveryStatus) {
            case 'sent':
              updateData.status = 'sent';
              break;
            case 'delivered':
              updateData.status = 'delivered';
              updateData.deliveredAt = new Date(parseInt(timestamp) * 1000);
              break;
            case 'read':
              updateData.status = 'delivered'; // Keep delivered as main status
              updateData.readAt = new Date(parseInt(timestamp) * 1000);
              break;
            case 'failed':
              updateData.status = 'failed';
              updateData.errorMsg = status.errors?.[0]?.message || 'Delivery failed';
              break;
          }

          await prisma.notificationLog.update({
            where: { id: notification.id },
            data: updateData,
          });

          logger.info(
            { notificationId: notification.id, wamid, deliveryStatus },
            'WhatsApp delivery status updated'
          );
        }
      }
    }
  } catch (error) {
    logger.error({ error, payload }, 'Error processing Meta webhook');
    throw error;
  }
}

// Type definitions for Meta webhook payload
interface MetaWebhookPayload {
  object: string;
  entry?: {
    id: string;
    changes?: {
      field: string;
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        statuses?: {
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: { code: number; message: string }[];
        }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          type: string;
        }[];
      };
    }[];
  }[];
}

export const whatsappService = {
  isMetaConfigured,
  sendTemplate,
  verifyWebhookSignature,
  handleWebhook,
};
