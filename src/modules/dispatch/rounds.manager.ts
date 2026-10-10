import { prisma } from '../../lib/prisma';
import { SYSTEM_CONSTANTS } from '../../config/constants';
import { DispatchEngine, DriverCandidate } from './dispatch.engine';
import { Coordinates } from '../geo/distance.service';
import { ServiceStatus } from '@prisma/client';
import { logger } from '../../lib/logger';
import { WhatsAppClient } from '../whatsapp/whatsapp.client';

export class RoundsManager {
  /**
   * Inicia o avanza a la siguiente ronda de despacho para un servicio
   */
  public static async executeRound(serviceId: string, roundNumber = 1): Promise<{
    success: boolean;
    notifiedDriversCount: number;
    roundNumber: number;
    status: ServiceStatus;
  }> {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        passenger: true,
        offers: true,
      },
    });

    if (!service) {
      logger.warn(`Servicio ${serviceId} no encontrado al ejecutar ronda ${roundNumber}`);
      return { success: false, notifiedDriversCount: 0, roundNumber, status: ServiceStatus.EXPIRED };
    }

    // Si el servicio ya fue tomado o cancelado, detener el despacho
    if (service.driverId || service.status !== ServiceStatus.SEARCHING_DRIVER) {
      return {
        success: true,
        notifiedDriversCount: 0,
        roundNumber,
        status: service.status,
      };
    }

    // Configuración de la ronda
    let targetCount = SYSTEM_CONSTANTS.ROUNDS.ROUND_1.DRIVER_COUNT;
    let targetRadius = SYSTEM_CONSTANTS.ROUNDS.ROUND_1.INITIAL_RADIUS_KM;

    if (roundNumber === 2) {
      targetCount = SYSTEM_CONSTANTS.ROUNDS.ROUND_2.DRIVER_COUNT;
      targetRadius = SYSTEM_CONSTANTS.ROUNDS.ROUND_2.RADIUS_KM;
    } else if (roundNumber >= 3) {
      targetCount = SYSTEM_CONSTANTS.ROUNDS.ROUND_3.DRIVER_COUNT;
      targetRadius = SYSTEM_CONSTANTS.ROUNDS.ROUND_3.RADIUS_KM;
    }

    // Conductores ya notificados previamente en este servicio
    const alreadyNotifiedDriverIds = new Set(service.offers.map((o) => o.driverId));

    // Obtener candidatos disponibles
    const availableDrivers = (await prisma.driver.findMany({
      where: {
        status: 'AVAILABLE',
        currentLatitude: { not: null },
        currentLongitude: { not: null },
        id: { notIn: Array.from(alreadyNotifiedDriverIds) },
      },
      include: { vehicle: true },
    })) as unknown as DriverCandidate[];

    const pickupLocation: Coordinates = {
      latitude: service.originLatitude,
      longitude: service.originLongitude,
    };

    const ranked = DispatchEngine.scoreAndRankCandidates(availableDrivers, pickupLocation, {
      maxRadiusKm: targetRadius,
      minSeats: service.passengersCount,
    });

    const selectedCandidates = ranked.slice(0, targetCount);

    if (selectedCandidates.length === 0) {
      if (roundNumber < 3) {
        logger.info(`Sin conductores en ronda ${roundNumber}, expandiendo inmediatamente a ronda ${roundNumber + 1}`);
        return this.executeRound(serviceId, roundNumber + 1);
      } else {
        // Fallback: No se encontraron conductores tras agotar las 3 rondas
        await prisma.service.update({
          where: { id: serviceId },
          data: { status: ServiceStatus.NO_DRIVER_AVAILABLE },
        });

        await prisma.serviceEvent.create({
          data: {
            serviceId,
            statusFrom: ServiceStatus.SEARCHING_DRIVER,
            statusTo: ServiceStatus.NO_DRIVER_AVAILABLE,
            triggeredBy: 'SYSTEM',
            payload: { reason: 'ALL_ROUNDS_EXHAUSTED' },
          },
        });

        // Notificar al pasajero con opciones de fallback
        await WhatsAppClient.sendNoDriverAvailableFallback(
          service.passenger.phone,
          service.id
        );

        return {
          success: false,
          notifiedDriversCount: 0,
          roundNumber,
          status: ServiceStatus.NO_DRIVER_AVAILABLE,
        };
      }
    }

    // 1. Actualizar estado del servicio a DRIVER_OFFERED
    await prisma.service.update({
      where: { id: serviceId },
      data: { status: ServiceStatus.DRIVER_OFFERED },
    });

    // 2. Crear ofertas y enviar notificaciones a los conductores seleccionados
    for (const candidate of selectedCandidates) {
      await prisma.serviceOffer.create({
        data: {
          serviceId,
          driverId: candidate.driver.id,
          roundNumber,
          score: candidate.score,
          distanceKm: candidate.distanceKm,
          etaMinutes: candidate.etaMinutes,
          status: 'PENDING',
        },
      });

      // Enviar mensaje de WhatsApp al conductor
      await WhatsAppClient.sendServiceOfferToDriver({
        driverPhone: candidate.driver.phone,
        serviceId: service.id,
        publicCode: service.publicCode,
        originAddress: service.originAddress,
        destinationAddress: service.destinationAddress,
        passengersCount: service.passengersCount,
        distanceKm: candidate.distanceKm,
        etaMinutes: candidate.etaMinutes,
      });
    }

    await prisma.serviceEvent.create({
      data: {
        serviceId,
        statusFrom: ServiceStatus.SEARCHING_DRIVER,
        statusTo: ServiceStatus.DRIVER_OFFERED,
        triggeredBy: 'SYSTEM',
        payload: {
          roundNumber,
          driversNotified: selectedCandidates.map((c) => ({
            driverId: c.driver.id,
            score: c.score,
            distanceKm: c.distanceKm,
            etaMinutes: c.etaMinutes,
          })),
        },
      },
    });

    logger.info(`Ronda ${roundNumber} despachada para servicio ${service.publicCode}`, {
      driversCount: selectedCandidates.length,
      roundNumber,
    });

    return {
      success: true,
      notifiedDriversCount: selectedCandidates.length,
      roundNumber,
      status: ServiceStatus.DRIVER_OFFERED,
    };
  }
}
