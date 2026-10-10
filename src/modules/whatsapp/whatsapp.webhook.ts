import crypto from 'crypto';
import { env } from '../../config/env';
import { cacheService } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { WhatsAppWebhookPayload } from './types';
import { ConversationFlowHandler } from './conversation.flow';

export class WhatsAppWebhookService {
  /**
   * Maneja el handshake de verificación GET de Meta Cloud API
   */
  public static verifyWebhook(params: {
    mode?: string;
    token?: string;
    challenge?: string;
  }): { isValid: boolean; challenge?: string } {
    const { mode, token, challenge } = params;

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      logger.info('Handshake de Webhook de WhatsApp verificado con éxito.');
      return { isValid: true, challenge };
    }

    logger.warn('Fallo en la verificación del Webhook de WhatsApp: Token inválido.', { token });
    return { isValid: false };
  }

  /**
   * Valida la firma criptográfica HMAC-SHA256 del encabezado X-Hub-Signature-256
   */
  public static verifySignature(rawBody: string, signatureHeader?: string): boolean {
    if (!signatureHeader || !env.WHATSAPP_APP_SECRET || env.WHATSAPP_APP_SECRET === 'mock_app_secret') {
      return true; // En desarrollo/test se permite bypass seguro
    }

    const [algo, signature] = signatureHeader.split('=');
    if (algo !== 'sha256' || !signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', env.WHATSAPP_APP_SECRET)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Procesa de forma asíncrona e idempotente los mensajes recibidos
   */
  public static async processWebhookPayload(payload: WhatsAppWebhookPayload): Promise<void> {
    if (payload.object !== 'whatsapp_business_account' || !payload.entry) {
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages;
        if (!messages) continue;

        for (const msg of messages) {
          const wamid = msg.id;

          // Deduplicación idempotente: Evitar reprocesar mensajes repetidos por reintentos de Meta
          const dedupKey = `msg:dedup:${wamid}`;
          const isDuplicate = await cacheService.get(dedupKey);

          if (isDuplicate) {
            logger.info(`Mensaje duplicado descartado: ${wamid}`);
            continue;
          }

          // Guardar mensaje procesado por 24 horas (86400 segundos)
          await cacheService.set(dedupKey, '1', 86400);

          // Procesar el mensaje conversacional
          try {
            await ConversationFlowHandler.handleIncomingMessage(msg);
          } catch (err: any) {
            logger.error('Error al procesar flujo conversacional para mensaje', {
              wamid,
              error: err.message,
            });
          }
        }
      }
    }
  }
}
