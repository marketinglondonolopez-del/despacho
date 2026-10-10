import { describe, it, expect } from 'vitest';
import { WhatsAppWebhookService } from '../modules/whatsapp/whatsapp.webhook';
import { env } from '../config/env';

describe('WhatsAppWebhookService', () => {
  it('valida exitosamente el handshake GET con token correcto', () => {
    const result = WhatsAppWebhookService.verifyWebhook({
      mode: 'subscribe',
      token: env.WHATSAPP_VERIFY_TOKEN,
      challenge: 'CHALLENGE_STRING_123',
    });

    expect(result.isValid).toBe(true);
    expect(result.challenge).toBe('CHALLENGE_STRING_123');
  });

  it('rechaza el handshake GET si el token es incorrecto', () => {
    const result = WhatsAppWebhookService.verifyWebhook({
      mode: 'subscribe',
      token: 'token_falso_invalido',
      challenge: 'CHALLENGE_STRING_123',
    });

    expect(result.isValid).toBe(false);
  });
});
