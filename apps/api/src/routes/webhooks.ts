import { Router, Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';
import { whatsappService } from '../services/whatsappService';

const router = Router();

/**
 * GET /api/webhooks/whatsapp
 * Meta webhook verification (challenge-response)
 *
 * Meta sends: GET with hub.mode, hub.verify_token, hub.challenge
 * We must respond with hub.challenge if verify_token matches
 */
router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info({ mode, hasToken: Boolean(token), hasChallenge: Boolean(challenge) }, 'WhatsApp webhook verification request');

  // Check if this is a verification request
  if (mode === 'subscribe' && token === config.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, token }, 'WhatsApp webhook verification failed');
  res.sendStatus(403);
});

/**
 * POST /api/webhooks/whatsapp
 * Meta webhook for delivery status callbacks
 *
 * Receives: message status updates (sent, delivered, read, failed)
 */
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    // Verify signature if secret is configured
    const signature = req.headers['x-hub-signature-256'] as string;

    if (config.WHATSAPP_WEBHOOK_SECRET && signature) {
      const rawBody = JSON.stringify(req.body);
      const isValid = whatsappService.verifyWebhookSignature(signature, rawBody);

      if (!isValid) {
        logger.warn('Invalid WhatsApp webhook signature');
        res.sendStatus(401);
        return;
      }
    }

    // Process the webhook payload
    await whatsappService.handleWebhook(req.body);

    // Always respond with 200 to acknowledge receipt
    // Meta will retry if we don't respond quickly
    res.sendStatus(200);
  } catch (error) {
    logger.error({ error }, 'Error processing WhatsApp webhook');
    // Still return 200 to prevent Meta from retrying
    // Log the error for debugging
    res.sendStatus(200);
  }
});

export default router;
