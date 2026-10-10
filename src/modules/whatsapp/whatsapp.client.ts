import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { WhatsAppButton, WhatsAppListSection } from './types';

export class WhatsAppClient {
  private static baseUrl = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  /**
   * Envía un mensaje general a la API de Meta Graph
   */
  private static async sendPayload(payload: Record<string, unknown>): Promise<boolean> {
    if (env.WHATSAPP_ACCESS_TOKEN === 'mock_access_token' || env.NODE_ENV === 'test') {
      logger.info('📱 [MOCK WHATSAPP ENVIADO]', payload);
      return true;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Error al enviar mensaje a WhatsApp Graph API', { errorData });
        return false;
      }

      return true;
    } catch (err: any) {
      logger.error('Fallo de red al conectar con WhatsApp API', { error: err.message });
      return false;
    }
  }

  /**
   * Envía un mensaje de texto plano
   */
  public static async sendTextMessage(to: string, text: string): Promise<boolean> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    };
    return this.sendPayload(payload);
  }

  /**
   * Envía un mensaje con botones interactivos (Máximo 3 botones permitido por Meta)
   */
  public static async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[]
  ): Promise<boolean> {
    if (buttons.length > 3) {
      throw new Error('Meta WhatsApp Cloud API admite un máximo estricto de 3 botones. Usa sendInteractiveList para más opciones.');
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: {
              id: b.id,
              title: b.title.substring(0, 20), // Meta limita títulos a 20 chars
            },
          })),
        },
      },
    };
    return this.sendPayload(payload);
  }

  /**
   * Envía un mensaje con lista interactiva (Permite hasta 10 opciones)
   * Ideal para Calificación de 1 a 5 estrellas y tags de experiencia
   */
  public static async sendInteractiveList(
    to: string,
    bodyText: string,
    buttonTitle: string,
    sections: WhatsAppListSection[]
  ): Promise<boolean> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonTitle.substring(0, 20),
          sections: sections.map((sec) => ({
            title: sec.title.substring(0, 24),
            rows: sec.rows.map((row) => ({
              id: row.id,
              title: row.title.substring(0, 24),
              description: row.description ? row.description.substring(0, 72) : undefined,
            })),
          })),
        },
      },
    };
    return this.sendPayload(payload);
  }

  /**
   * Notifica a un conductor sobre un nuevo servicio disponible
   */
  public static async sendServiceOfferToDriver(params: {
    driverPhone: string;
    serviceId: string;
    publicCode: string;
    originAddress: string;
    destinationAddress: string;
    passengersCount: number;
    distanceKm: number;
    etaMinutes: number;
  }) {
    const message =
      `🚨 *NUEVO SERVICIO DISPONIBLE*\n\n` +
      `📍 *Recogida:* ${params.originAddress}\n` +
      `🎯 *Destino:* ${params.destinationAddress}\n` +
      `👤 *Pasajeros:* ${params.passengersCount}\n` +
      `📏 *Distancia:* ${params.distanceKm} km\n` +
      `⏱️ *ETA aprox:* ${params.etaMinutes} min\n` +
      `🆔 *Servicio:* ${params.publicCode}\n\n` +
      `¿Qué deseas hacer?`;

    const buttons: WhatsAppButton[] = [
      { id: `DRIVER_CLAIM:${params.serviceId}`, title: '🟢 TOMAR SERVICIO' },
      { id: `DRIVER_DELAY:${params.serviceId}`, title: '🟡 TENGO DEMORA' },
      { id: `DRIVER_REJECT:${params.serviceId}`, title: '🔴 NO PUEDO' },
    ];

    return this.sendInteractiveButtons(params.driverPhone, message, buttons);
  }

  /**
   * Notifica al pasajero cuando se encuentra conductor disponible (Pre-confirmación)
   */
  public static async sendDriverFoundToPassenger(params: {
    passengerPhone: string;
    serviceId: string;
    driverName: string;
    ratingDisplay: string;
    vehicleBrandModel: string;
    licensePlate: string;
    etaMinutes: number;
    delayMinutes?: number;
  }) {
    const etaText = params.delayMinutes
      ? `${params.delayMinutes} minutos (Conductor informó demora)`
      : `${params.etaMinutes} minutos aprox.`;

    const message =
      `🚕 *ENCONTRAMOS TU CONDUCTOR*\n\n` +
      `👨‍✈️ *${params.driverName}*\n` +
      `${params.ratingDisplay}\n\n` +
      `🚗 ${params.vehicleBrandModel}\n` +
      `🔢 Placa: ${params.licensePlate}\n\n` +
      `⏱️ Llegará en: ${etaText}\n\n` +
      `¿Confirmas el servicio?`;

    const buttons: WhatsAppButton[] = [
      { id: `PASSENGER_CONFIRM:${params.serviceId}`, title: '✅ CONFIRMAR' },
      { id: `PASSENGER_CANCEL:${params.serviceId}`, title: '❌ CANCELAR' },
    ];

    return this.sendInteractiveButtons(params.passengerPhone, message, buttons);
  }

  /**
   * Envía confirmación final a ambos actores (Pasajero y Conductor)
   */
  public static async sendServiceConfirmed(params: {
    passengerPhone: string;
    driverPhone: string;
    driverName: string;
    vehicleBrandModel: string;
    licensePlate: string;
    originAddress: string;
    destinationAddress: string;
    etaMinutes: number;
    passengersCount: number;
    notes?: string | null;
  }) {
    // 1. Mensaje al Pasajero
    const passengerMsg =
      `✅ *SERVICIO CONFIRMADO*\n\n` +
      `🚕 *Tu conductor:* ${params.driverName}\n` +
      `🚗 *Vehículo:* ${params.vehicleBrandModel}\n` +
      `🔢 *Placa:* ${params.licensePlate}\n` +
      `📍 *Te recogerá en:* ${params.originAddress}\n` +
      `🎯 *Destino:* ${params.destinationAddress}\n` +
      `⏱️ *Tiempo estimado:* ${params.etaMinutes} min\n\n` +
      `📞 *Contacto conductor:* ${params.driverPhone}\n\n` +
      `Por favor espera en un lugar visible y seguro. ¡Gracias por viajar con nosotros! 🚕`;

    await this.sendTextMessage(params.passengerPhone, passengerMsg);

    // 2. Mensaje al Conductor
    const driverMsg =
      `✅ *SERVICIO CONFIRMADO*\n\n` +
      `📞 *Teléfono pasajero:* ${params.passengerPhone}\n` +
      `📍 *Recogida:* ${params.originAddress}\n` +
      `🎯 *Destino:* ${params.destinationAddress}\n` +
      `👥 *Pasajeros:* ${params.passengersCount}\n` +
      `📝 *Observación:* ${params.notes || 'Ninguna'}\n\n` +
      `Por favor dirígete de inmediato al punto de recogida.`;

    await this.sendTextMessage(params.driverPhone, driverMsg);
  }

  /**
   * Envía solicitud de calificación al finalizar el viaje (Lista interactiva de 1 a 5 estrellas)
   */
  public static async sendRatingPrompt(passengerPhone: string, serviceId: string) {
    const message =
      `🏁 *¡SERVICIO FINALIZADO!*\n\n` +
      `Esperamos que hayas tenido una excelente experiencia.\n\n` +
      `⭐ *¿CÓMO FUE TU SERVICIO?*\n` +
      `Por favor califica a tu conductor seleccionando las estrellas:`;

    const sections: WhatsAppListSection[] = [
      {
        title: 'Calificación del Conductor',
        rows: [
          { id: `RATE_5:${serviceId}`, title: '⭐⭐⭐⭐⭐ 5 Estrellas', description: 'Excelente servicio' },
          { id: `RATE_4:${serviceId}`, title: '⭐⭐⭐⭐ 4 Estrellas', description: 'Muy buen servicio' },
          { id: `RATE_3:${serviceId}`, title: '⭐⭐⭐ 3 Estrellas', description: 'Servicio regular' },
          { id: `RATE_2:${serviceId}`, title: '⭐⭐ 2 Estrellas', description: 'Mala experiencia' },
          { id: `RATE_1:${serviceId}`, title: '⭐ 1 Estrella', description: 'Pésimo servicio' },
        ],
      },
    ];

    return this.sendInteractiveList(passengerPhone, message, '⭐ Calificar servicio', sections);
  }

  /**
   * Envía tags opcionales de retroalimentación tras calificar
   */
  public static async sendRatingTagsPrompt(passengerPhone: string, serviceId: string, stars: number) {
    const message =
      `Gracias por tu calificación de ${stars} estrellas. ⭐\n\n` +
      `¿Quieres contarnos más sobre tu experiencia? (Opcional)`;

    const sections: WhatsAppListSection[] = [
      {
        title: 'Detalles del Viaje',
        rows: [
          { id: `TAG:Excelente servicio:${serviceId}`, title: '👍 Excelente servicio' },
          { id: `TAG:Muy buen conductor:${serviceId}`, title: '🚗 Muy buen conductor' },
          { id: `TAG:Amable:${serviceId}`, title: '😊 Amable' },
          { id: `TAG:Llego a tiempo:${serviceId}`, title: '⏱️ Llegó a tiempo' },
          { id: `TAG:Vehiculo limpio:${serviceId}`, title: '🧼 Vehículo limpio' },
          { id: `TAG:Tuvo demora:${serviceId}`, title: '⚠️ Tuvo demora' },
          { id: `TAG:Mala experiencia:${serviceId}`, title: '😕 Mala experiencia' },
          { id: `TAG:Omitir:${serviceId}`, title: '➡️ Omitir detalle' },
        ],
      },
    ];

    return this.sendInteractiveList(passengerPhone, message, '📝 Seleccionar detalle', sections);
  }

  /**
   * Notificación cuando no hay conductores en el radio
   */
  public static async sendNoDriverAvailableFallback(passengerPhone: string, serviceId: string) {
    const message =
      `😔 En este momento no encontramos un conductor disponible cerca de tu ubicación.\n\n` +
      `¿Quieres que sigamos buscando ampliando el radio de búsqueda?`;

    const buttons: WhatsAppButton[] = [
      { id: `RETRY_SEARCH:${serviceId}`, title: '🔄 SEGUIR BUSCANDO' },
      { id: `CANCEL_SEARCH:${serviceId}`, title: '❌ CANCELAR' },
    ];

    return this.sendInteractiveButtons(passengerPhone, message, buttons);
  }
}
