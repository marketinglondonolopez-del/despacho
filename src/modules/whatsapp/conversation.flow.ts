import { prisma } from '../../lib/prisma';
import { WhatsAppClient } from './whatsapp.client';
import { WhatsAppIncomingMessage } from './types';
import { ServiceService } from '../services/service.service';
import { AtomicClaimService } from '../dispatch/atomic-claim';
import { RatingService } from '../ratings/rating.service';
import { GeocodingService } from '../geo/geocoding.service';
import { RoundsManager } from '../dispatch/rounds.manager';
import { logger } from '../../lib/logger';
import { ServiceStatus } from '@prisma/client';

export class ConversationFlowHandler {
  /**
   * Procesa cualquier mensaje entrante de WhatsApp (texto, botón interactivo, lista o ubicación)
   */
  public static async handleIncomingMessage(msg: WhatsAppIncomingMessage): Promise<void> {
    const fromPhone = msg.from;

    // 1. Obtener o crear pasajero y su sesión conversacional
    let passenger = await prisma.passenger.findUnique({
      where: { phone: fromPhone },
      include: { conversation: true },
    });

    if (!passenger) {
      passenger = await prisma.passenger.create({
        data: {
          phone: fromPhone,
          conversation: {
            create: { currentStep: 'IDLE' },
          },
        },
        include: { conversation: true },
      });
    }

    const session =
      passenger.conversation ||
      (await prisma.whatsAppSession.create({
        data: { passengerId: passenger.id, currentStep: 'IDLE' },
      }));

    // 2. Extraer acción/payload interactivo si existe
    const buttonId = msg.interactive?.button_reply?.id;
    const listId = msg.interactive?.list_reply?.id;
    const actionId = buttonId || listId;
    const textBody = msg.text?.body?.trim();

    // -------------------------------------------------------------
    // GESTIÓN DE ACCIONES DE CONDUCTORES
    // -------------------------------------------------------------
    if (actionId?.startsWith('DRIVER_CLAIM:')) {
      const serviceId = actionId.split(':')[1];
      const driver = await prisma.driver.findUnique({ where: { phone: fromPhone } });
      if (!driver) {
        await WhatsAppClient.sendTextMessage(fromPhone, '❌ No estás registrado como conductor activo.');
        return;
      }

      const claimResult = await AtomicClaimService.claimService(serviceId, driver.id);
      if (claimResult.success && claimResult.service) {
        await WhatsAppClient.sendTextMessage(
          fromPhone,
          `✅ *¡SERVICIO ASIGNADO!*\n\nTe has quedado con el servicio ${claimResult.service.publicCode}.\nEsperando confirmación del pasajero.`
        );

        // Notificar al pasajero con el perfil del conductor
        await WhatsAppClient.sendDriverFoundToPassenger({
          passengerPhone: claimResult.service.passenger.phone,
          serviceId: claimResult.service.id,
          driverName: driver.name,
          ratingDisplay: `⭐ ${driver.ratingAverage.toFixed(1)} · ${driver.ratingCount} calificaciones`,
          vehicleBrandModel: `${claimResult.service.driver.vehicle?.brand} ${claimResult.service.driver.vehicle?.model}`,
          licensePlate: claimResult.service.driver.vehicle?.licensePlate || '',
          etaMinutes: claimResult.service.estimatedDurationMin || 7,
        });
      } else {
        await WhatsAppClient.sendTextMessage(fromPhone, claimResult.message);
      }
      return;
    }

    if (actionId?.startsWith('DRIVER_DELAY:')) {
      const serviceId = actionId.split(':')[1];
      const delayButtons = [
        { id: `DRIVER_DELAY_VAL:${serviceId}:10`, title: '⏱️ 5-10 Minutos' },
        { id: `DRIVER_DELAY_VAL:${serviceId}:20`, title: '⏱️ 10-20 Minutos' },
        { id: `DRIVER_DELAY_VAL:${serviceId}:30`, title: '⏱️ 20-30 Minutos' },
      ];
      await WhatsAppClient.sendInteractiveButtons(
        fromPhone,
        '¿Cuánto tiempo estimas que tardarás en llegar al punto de recogida?',
        delayButtons
      );
      return;
    }

    if (actionId?.startsWith('DRIVER_DELAY_VAL:')) {
      const [, serviceId, minutesStr] = actionId.split(':');
      const delayMinutes = parseInt(minutesStr, 10);
      const driver = await prisma.driver.findUnique({ where: { phone: fromPhone } });
      if (driver) {
        await ServiceService.reportDriverDelay(serviceId, driver.id, delayMinutes);
        await WhatsAppClient.sendTextMessage(
          fromPhone,
          `⏱️ Hemos informado tu demora estimada de ${delayMinutes} min al pasajero.`
        );
      }
      return;
    }

    if (actionId?.startsWith('DRIVER_REJECT:')) {
      const serviceId = actionId.split(':')[1];
      await prisma.serviceOffer.updateMany({
        where: { serviceId, driver: { phone: fromPhone } },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });
      await WhatsAppClient.sendTextMessage(fromPhone, 'Entendido, solicitud declinada.');
      return;
    }

    // -------------------------------------------------------------
    // GESTIÓN DE ACCIONES DE PASAJEROS
    // -------------------------------------------------------------
    if (actionId?.startsWith('PASSENGER_CONFIRM:')) {
      const serviceId = actionId.split(':')[1];
      await ServiceService.confirmServiceByPassenger(serviceId, passenger.id);
      return;
    }

    if (actionId?.startsWith('PASSENGER_CANCEL:')) {
      const serviceId = actionId.split(':')[1];
      await ServiceService.cancelService({
        serviceId,
        cancelledBy: 'CUSTOMER',
        passengerId: passenger.id,
        reason: 'Cancelado por el usuario en WhatsApp',
      });
      return;
    }

    if (actionId?.startsWith('RETRY_SEARCH:')) {
      const serviceId = actionId.split(':')[1];
      await prisma.service.update({
        where: { id: serviceId },
        data: { status: ServiceStatus.SEARCHING_DRIVER },
      });
      await WhatsAppClient.sendTextMessage(fromPhone, '🔄 Ampliando radio de búsqueda...');
      await RoundsManager.executeRound(serviceId, 2);
      return;
    }

    // -------------------------------------------------------------
    // CALIFICACIÓN Y REPUTACIÓN POST-VIAJE
    // -------------------------------------------------------------
    if (actionId?.startsWith('RATE_')) {
      const match = actionId.match(/RATE_(\d):(.*)/);
      if (match) {
        const stars = parseInt(match[1], 10);
        const serviceId = match[2];

        try {
          await RatingService.submitRating({
            serviceId,
            passengerId: passenger.id,
            stars,
            ipAddress: 'whatsapp_webhook',
            userAgent: 'WhatsApp/CloudAPI',
          });

          // Enviar formulario de etiquetas opcionales
          await WhatsAppClient.sendRatingTagsPrompt(fromPhone, serviceId, stars);
        } catch (err: any) {
          await WhatsAppClient.sendTextMessage(fromPhone, `⚠️ ${err.message}`);
        }
      }
      return;
    }

    if (actionId?.startsWith('TAG:')) {
      const parts = actionId.split(':');
      const tagName = parts[1];
      const serviceId = parts[2];

      if (tagName !== 'Omitir') {
        await prisma.rating.updateMany({
          where: { serviceId },
          data: { feedbackTag: tagName },
        });
      }

      await WhatsAppClient.sendTextMessage(
        fromPhone,
        '🙏 *¡Muchas gracias por calificarnos!*\n\nTu opinión es muy valiosa para mantener la más alta calidad y seguridad en nuestros servicios.'
      );
      return;
    }

    // -------------------------------------------------------------
    // FLUJO CONVERSACIONAL GUIADO (SOLICITUD DE VIAJE)
    // -------------------------------------------------------------
    if (actionId === 'ACTION_REQUEST_SERVICE' || textBody?.toLowerCase() === 'solicitar') {
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { currentStep: 'ASKING_ORIGIN', draftServiceData: {} },
      });

      await WhatsAppClient.sendTextMessage(
        fromPhone,
        '📍 *¿Dónde deseas que te recojamos?*\n\nPuedes compartir tu ubicación por WhatsApp o escribir la dirección / barrio de referencia.'
      );
      return;
    }

    if (actionId === 'ACTION_CHECK_STATUS') {
      const activeService = await prisma.service.findFirst({
        where: {
          passengerId: passenger.id,
          status: {
            notIn: [
              ServiceStatus.COMPLETED,
              ServiceStatus.CANCELLED_BY_CUSTOMER,
              ServiceStatus.CANCELLED_BY_DRIVER,
              ServiceStatus.NO_DRIVER_AVAILABLE,
            ],
          },
        },
        include: { driver: { include: { vehicle: true } } },
      });

      if (!activeService) {
        await WhatsAppClient.sendTextMessage(fromPhone, 'No tienes ningún servicio activo en este momento.');
      } else {
        await WhatsAppClient.sendTextMessage(
          fromPhone,
          `🚕 *ESTADO DE TU SERVICIO: ${activeService.publicCode}*\n\n` +
            `📍 Estado actual: *${activeService.status}*\n` +
            `📍 Origen: ${activeService.originAddress}\n` +
            `🎯 Destino: ${activeService.destinationAddress}\n` +
            (activeService.driver ? `👨‍✈️ Conductor: ${activeService.driver.name}` : 'Buscando conductor cercano...')
        );
      }
      return;
    }

    if (actionId === 'CONFIRM_REQUEST') {
      const draft = (session.draftServiceData || {}) as Record<string, any>;
      try {
        const service = await ServiceService.createService({
          passengerPhone: fromPhone,
          passengerName: passenger.name || undefined,
          originAddress: draft.originAddress,
          originCoords: draft.originCoords,
          destinationAddress: draft.destinationAddress,
          destinationCoords: draft.destinationCoords,
          passengersCount: draft.passengersCount || 1,
          notes: draft.notes,
        });

        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { currentStep: 'IDLE', draftServiceData: {} },
        });

        await WhatsAppClient.sendTextMessage(
          fromPhone,
          `🚕 *¡SOLICITUD CONFIRMADA!*\n\n` +
            `Servicio creado con código: *${service.publicCode}*\n` +
            `Estamos notificando a los conductores más cercanos a tu ubicación. En breve te avisaremos.`
        );
      } catch (err: any) {
        await WhatsAppClient.sendTextMessage(fromPhone, `⚠️ ${err.message}`);
      }
      return;
    }

    if (actionId === 'CANCEL_REQUEST') {
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { currentStep: 'IDLE', draftServiceData: {} },
      });
      await WhatsAppClient.sendTextMessage(fromPhone, 'Solicitud cancelada. Escribe *Hola* cuando nos necesites.');
      return;
    }

    // PASO A PASO POR TEXTO / UBICACIÓN
    switch (session.currentStep) {
      case 'ASKING_ORIGIN': {
        let originAddress = textBody || 'Ubicación seleccionada';
        let originCoords: { latitude: number; longitude: number } | undefined;

        if (msg.location) {
          originCoords = { latitude: msg.location.latitude, longitude: msg.location.longitude };
          originAddress = await GeocodingService.reverseGeocode(originCoords);
        } else {
          const resolved = await GeocodingService.resolveAddressToCoordinates(originAddress);
          originCoords = { latitude: resolved.latitude, longitude: resolved.longitude };
          originAddress = resolved.formattedAddress;
        }

        const draft = { ...(session.draftServiceData as object), originAddress, originCoords };

        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { currentStep: 'ASKING_DESTINATION', draftServiceData: draft },
        });

        await WhatsAppClient.sendTextMessage(
          fromPhone,
          `📍 Recogida guardada: *${originAddress}*\n\n🎯 *¿Cuál es tu lugar de destino?*`
        );
        return;
      }

      case 'ASKING_DESTINATION': {
        let destinationAddress = textBody || 'Destino seleccionado';
        let destinationCoords: { latitude: number; longitude: number } | undefined;

        if (msg.location) {
          destinationCoords = { latitude: msg.location.latitude, longitude: msg.location.longitude };
          destinationAddress = await GeocodingService.reverseGeocode(destinationCoords);
        } else {
          const resolved = await GeocodingService.resolveAddressToCoordinates(destinationAddress);
          destinationCoords = { latitude: resolved.latitude, longitude: resolved.longitude };
          destinationAddress = resolved.formattedAddress;
        }

        const draft = { ...(session.draftServiceData as object), destinationAddress, destinationCoords };

        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { currentStep: 'ASKING_PASSENGERS', draftServiceData: draft },
        });

        const passengerButtons = [
          { id: 'PASSENGERS_1', title: '👤 1 Pasajero' },
          { id: 'PASSENGERS_2', title: '👥 2 Pasajeros' },
          { id: 'PASSENGERS_4', title: '👥 4 Pasajeros' },
        ];

        await WhatsAppClient.sendInteractiveButtons(
          fromPhone,
          `🎯 Destino guardado: *${destinationAddress}*\n\n👤 *¿Cuántos pasajeros viajarán?* (O escribe el número)`,
          passengerButtons
        );
        return;
      }

      case 'ASKING_PASSENGERS': {
        let count = 1;
        if (actionId?.startsWith('PASSENGERS_')) {
          count = parseInt(actionId.replace('PASSENGERS_', ''), 10) || 1;
        } else if (textBody) {
          count = parseInt(textBody, 10) || 1;
        }

        const draft = { ...(session.draftServiceData as object), passengersCount: count };

        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { currentStep: 'ASKING_NOTES', draftServiceData: draft },
        });

        await WhatsAppClient.sendTextMessage(
          fromPhone,
          `👤 Pasajeros: *${count}*\n\n📝 *¿Tienes alguna observación especial?*\n(Ejemplo: "2 maletas", "voy con una mascota". O responde *NO* para continuar)`
        );
        return;
      }

      case 'ASKING_NOTES': {
        const notes = textBody && textBody.toLowerCase() !== 'no' ? textBody : undefined;
        const draft = { ...(session.draftServiceData as object), notes } as Record<string, any>;

        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { currentStep: 'CONFIRM_SERVICE', draftServiceData: draft },
        });

        const summaryMsg =
          `🚕 *RESUMEN DE TU SERVICIO*\n\n` +
          `📍 *Recogida:* ${draft.originAddress}\n` +
          `🎯 *Destino:* ${draft.destinationAddress}\n` +
          `👤 *Pasajeros:* ${draft.passengersCount}\n` +
          `📝 *Observación:* ${draft.notes || 'Ninguna'}\n\n` +
          `¿Confirmas la solicitud?`;

        const confirmButtons = [
          { id: 'CONFIRM_REQUEST', title: '✅ CONFIRMAR' },
          { id: 'CANCEL_REQUEST', title: '❌ CANCELAR' },
        ];

        await WhatsAppClient.sendInteractiveButtons(fromPhone, summaryMsg, confirmButtons);
        return;
      }

      default: {
        // Menú de bienvenida general si escribe "Hola" o cualquier mensaje libre
        const welcomeButtons = [
          { id: 'ACTION_REQUEST_SERVICE', title: '🚕 SOLICITAR SERVICIO' },
          { id: 'ACTION_CHECK_STATUS', title: '📋 CONSULTAR SERVICIO' },
          { id: 'ACTION_CANCEL_SERVICE', title: '❌ CANCELAR' },
        ];

        await WhatsAppClient.sendInteractiveButtons(
          fromPhone,
          `👋 *¡Hola! Bienvenido.*\n\nEstamos listos para ayudarte a solicitar tu servicio de transporte rápido y seguro.\n\n¿Qué deseas hacer?`,
          welcomeButtons
        );
      }
    }
  }
}
