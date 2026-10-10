import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppWebhookService } from '@/modules/whatsapp/whatsapp.webhook';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode') || undefined;
  const token = searchParams.get('hub.verify_token') || undefined;
  const challenge = searchParams.get('hub.challenge') || undefined;

  const result = WhatsAppWebhookService.verifyWebhook({ mode, token, challenge });

  if (result.isValid && result.challenge) {
    return new NextResponse(result.challenge, { status: 200 });
  }

  return new NextResponse('Verificación fallida', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || undefined;

    // Validación de firma HMAC
    const isSignatureValid = WhatsAppWebhookService.verifySignature(rawBody, signature);
    if (!isSignatureValid) {
      logger.warn('Firma criptográfica inválida en Webhook de WhatsApp');
      return new NextResponse('Firma no autorizada', { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Procesamiento asíncrono e idempotente (para responder HTTP 200 en <50ms a Meta)
    WhatsAppWebhookService.processWebhookPayload(payload).catch((err) => {
      logger.error('Error no capturado en procesamiento de webhook', { error: err.message });
    });

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: any) {
    logger.error('Error al procesar POST /api/webhooks/whatsapp', { error: err.message });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
