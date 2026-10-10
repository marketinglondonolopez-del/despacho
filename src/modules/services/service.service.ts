import { prisma } from '../../lib/prisma';
import { ServiceStatus, DriverStatus, CancellationSource } from '@prisma/client';
import { ServiceStateMachine } from '../../core/state-machine/service-state-machine';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/app-error';
import { logger } from '../../lib/logger';
import { GeocodingService } from '../geo/geocoding.service';
import { DistanceService } from '../geo/distance.service';
import { RoundsManager } from '../dispatch/rounds.manager';
import { WhatsAppClient } from '../whatsapp/whatsapp.client';

export interface CreateServiceInput {
  passengerPhone: string;
  passengerName?: string;
  originAddress: string;
  originCoords?: { latitude: number; longitude: number };
  destinationAddress: string;
  destinationCoords?: { latitude: number; longitude: number };
  passengersCount?: number;
  notes?: string;
}

export const memoryServices: any[] = [];

export class ServiceService {
  /**
   * Genera un código legible único con formato SRV-YYYYMMDD-XXXXXX
   */
  public static generatePublicCode(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
    return `SRV-${dateStr}-${randomHex}`;
  }

  /**
   * Crea un nuevo servicio de transporte y arranca la búsqueda de conductores
   */
  public static async createService(input: CreateServiceInput) {
    const { passengerPhone, passengerName, originAddress, destinationAddress, notes } = input;
    const passengersCount = input.passengersCount || 1;

    // 1. Obtener o crear pasajero
    let passenger = await prisma.passenger.findUnique({
      where: { phone: passengerPhone },
    });

    if (!passenger) {
      passenger = await prisma.passenger.create({
        data: {
          phone: passengerPhone,
          name: passengerName || 'Pasajero WhatsApp',
        },
      });
    }

    // 2. Control anti-spam: Máximo 1 servicio activo por pasajero
    const existingActiveService = await prisma.service.findFirst({
      where: {
        passengerId: passenger.id,
        status: {
          notIn: [
            ServiceStatus.COMPLETED,
            ServiceStatus.CANCELLED_BY_CUSTOMER,
            ServiceStatus.CANCELLED_BY_DRIVER,
            ServiceStatus.NO_DRIVER_AVAILABLE,
            ServiceStatus.EXPIRED,
          ],
        },
      },
    });

    if (existingActiveService) {
      throw new ConflictError(
        `Ya tienes un servicio activo (${existingActiveService.publicCode}). Debes completar o cancelar tu viaje actual antes de solicitar uno nuevo.`
      );
    }

    // 3. Geocodificar origen y destino
    const originGeo = input.originCoords || (await GeocodingService.resolveAddressToCoordinates(originAddress));
    const destGeo = input.destinationCoords || (await GeocodingService.resolveAddressToCoordinates(destinationAddress));

    const { distanceKm, etaMinutes } = DistanceService.getDistanceAndEta(originGeo, destGeo);
    const publicCode = this.generatePublicCode();

    try {
      const service = await prisma.service.create({
        data: {
          publicCode,
          passengerId: passenger.id,
          status: ServiceStatus.SEARCHING_DRIVER,
          originAddress: (originGeo as any).formattedAddress || originAddress,
          originLatitude: originGeo.latitude,
          originLongitude: originGeo.longitude,
          destinationAddress: (destGeo as any).formattedAddress || destinationAddress,
          destinationLatitude: destGeo.latitude,
          destinationLongitude: destGeo.longitude,
          passengersCount,
          notes: notes || null,
          estimatedDistanceKm: distanceKm,
          estimatedDurationMin: etaMinutes,
        },
        include: {
          passenger: true,
        },
      });

      await prisma.serviceEvent.create({
        data: {
          serviceId: service.id,
          statusFrom: ServiceStatus.CREATED,
          statusTo: ServiceStatus.SEARCHING_DRIVER,
          triggeredBy: `PASSENGER:${passenger.phone}`,
          payload: { publicCode, distanceKm, etaMinutes },
        },
      });

      RoundsManager.executeRound(service.id, 1).catch((err) => {
        logger.error('Error al ejecutar Ronda 1', { serviceId: service.id, error: err.message });
      });

      return service;
    } catch {
      // Fallback en memoria si la BD está offline
      const memoryService = {
        id: `srv-${Date.now()}`,
        publicCode,
        passengerId: passenger?.id || `pass-${Date.now()}`,
        status: ServiceStatus.SEARCHING_DRIVER,
        originAddress: (originGeo as any).formattedAddress || originAddress,
        originLatitude: originGeo.latitude,
        originLongitude: originGeo.longitude,
        destinationAddress: (destGeo as any).formattedAddress || destinationAddress,
        destinationLatitude: destGeo.latitude,
        destinationLongitude: destGeo.longitude,
        passengersCount,
        notes: notes || null,
        estimatedDistanceKm: distanceKm,
        estimatedDurationMin: etaMinutes,
        createdAt: new Date(),
        passenger: { name: passengerName || 'Pasajero WhatsApp', phone: passengerPhone },
        driver: null,
      };

      memoryServices.unshift(memoryService);
      return memoryService;
    }
  }

  /**
   * Conductor reporta demora estimada (5-10m, 10-20m, 20-30m, >30m)
   */
  public static async reportDriverDelay(serviceId: string, driverId: string, delayMinutes: number) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { passenger: true, driver: true },
    });

    if (!service) throw new NotFoundError('Servicio no encontrado');

    ServiceStateMachine.validateTransition(service.status, ServiceStatus.WAITING_CUSTOMER_CONFIRMATION);

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { vehicle: true },
    });

    if (!driver) throw new NotFoundError('Conductor no encontrado');

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        driverId,
        driverDelayReportedMin: delayMinutes,
        status: ServiceStatus.WAITING_CUSTOMER_CONFIRMATION,
      },
      include: { passenger: true, driver: { include: { vehicle: true } } },
    });

    await prisma.serviceEvent.create({
      data: {
        serviceId,
        statusFrom: service.status,
        statusTo: ServiceStatus.WAITING_CUSTOMER_CONFIRMATION,
        triggeredBy: `DRIVER:${driverId}`,
        payload: { delayMinutes },
      },
    });

    // Notificar al pasajero sobre la demora para que confirme o cancele
    await WhatsAppClient.sendDriverFoundToPassenger({
      passengerPhone: service.passenger.phone,
      serviceId: service.id,
      driverName: driver.name,
      ratingDisplay: `⭐ ${driver.ratingAverage.toFixed(1)} · ${driver.ratingCount} calificaciones`,
      vehicleBrandModel: `${driver.vehicle?.brand} ${driver.vehicle?.model}`,
      licensePlate: driver.vehicle?.licensePlate || '',
      etaMinutes: service.estimatedDurationMin || 10,
      delayMinutes,
    });

    return updated;
  }

  /**
   * Pasajero confirma la asignación o demora
   */
  public static async confirmServiceByPassenger(serviceId: string, passengerId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        passenger: true,
        driver: { include: { vehicle: true } },
      },
    });

    if (!service) throw new NotFoundError('Servicio no encontrado');
    if (service.passengerId !== passengerId) throw new ConflictError('No autorizado para confirmar este servicio');
    if (!service.driver) throw new ConflictError('Aún no hay un conductor asignado para confirmar');

    ServiceStateMachine.validateTransition(service.status, ServiceStatus.CONFIRMED);

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: { status: ServiceStatus.CONFIRMED },
      include: { passenger: true, driver: { include: { vehicle: true } } },
    });

    await prisma.serviceEvent.create({
      data: {
        serviceId,
        statusFrom: service.status,
        statusTo: ServiceStatus.CONFIRMED,
        triggeredBy: `PASSENGER:${passengerId}`,
      },
    });

    // Notificar confirmación definitiva a ambos
    await WhatsAppClient.sendServiceConfirmed({
      passengerPhone: service.passenger.phone,
      driverPhone: service.driver.phone,
      driverName: service.driver.name,
      vehicleBrandModel: `${service.driver.vehicle?.brand} ${service.driver.vehicle?.model}`,
      licensePlate: service.driver.vehicle?.licensePlate || '',
      originAddress: service.originAddress,
      destinationAddress: service.destinationAddress,
      etaMinutes: service.driverDelayReportedMin || service.estimatedDurationMin || 7,
      passengersCount: service.passengersCount,
      notes: service.notes,
    });

    return updated;
  }

  /**
   * Conductor presiona "YA LLEGUÉ"
   */
  public static async driverArrived(serviceId: string, driverId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { passenger: true },
    });

    if (!service) throw new NotFoundError('Servicio no encontrado');
    if (service.driverId !== driverId) throw new ConflictError('Conductor no asignado a este servicio');

    ServiceStateMachine.validateTransition(service.status, ServiceStatus.DRIVER_ARRIVED);

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: ServiceStatus.DRIVER_ARRIVED,
        driverArrivedAt: new Date(),
      },
      include: { passenger: true },
    });

    await prisma.serviceEvent.create({
      data: {
        serviceId,
        statusFrom: service.status,
        statusTo: ServiceStatus.DRIVER_ARRIVED,
        triggeredBy: `DRIVER:${driverId}`,
      },
    });

    // Notificar al pasajero que el conductor ya llegó
    await WhatsAppClient.sendTextMessage(
      service.passenger.phone,
      '🚕 *Tu conductor ya llegó.*\n\nPor favor dirígete al punto de recogida acordado.'
    );

    return updated;
  }

  /**
   * Conductor presiona "▶️ INICIAR SERVICIO"
   */
  public static async startService(serviceId: string, driverId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { passenger: true },
    });

    if (!service) throw new NotFoundError('Servicio no encontrado');
    if (service.driverId !== driverId) throw new ConflictError('Conductor no asignado a este servicio');

    ServiceStateMachine.validateTransition(service.status, ServiceStatus.IN_PROGRESS);

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: ServiceStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: { passenger: true },
    });

    await prisma.serviceEvent.create({
      data: {
        serviceId,
        statusFrom: service.status,
        statusTo: ServiceStatus.IN_PROGRESS,
        triggeredBy: `DRIVER:${driverId}`,
      },
    });

    await WhatsAppClient.sendTextMessage(
      service.passenger.phone,
      '🚕 *Tu servicio ha comenzado.*\n\n¡Te deseamos un excelente viaje!'
    );

    return updated;
  }

  /**
   * Conductor presiona "✅ FINALIZAR SERVICIO"
   */
  public static async completeService(serviceId: string, driverId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { passenger: true },
    });

    if (!service) throw new NotFoundError('Servicio no encontrado');
    if (service.driverId !== driverId) throw new ConflictError('Conductor no asignado a este servicio');

    ServiceStateMachine.validateTransition(service.status, ServiceStatus.COMPLETED);

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: ServiceStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: { passenger: true },
    });

    // Liberar estado del conductor a AVAILABLE e incrementar servicios completados
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        status: DriverStatus.AVAILABLE,
        completedServicesCount: { increment: 1 },
      },
    });

    await prisma.serviceEvent.create({
      data: {
        serviceId,
        statusFrom: service.status,
        statusTo: ServiceStatus.COMPLETED,
        triggeredBy: `DRIVER:${driverId}`,
      },
    });

    // Enviar solicitud de calificación al pasajero
    await WhatsAppClient.sendRatingPrompt(service.passenger.phone, service.id);

    return updated;
  }

  /**
   * Cancelación de servicio (por Pasajero o Conductor)
   */
  public static async cancelService(params: {
    serviceId: string;
    cancelledBy: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
    reason: string;
    driverId?: string;
    passengerId?: string;
    notes?: string;
  }) {
    const { serviceId, cancelledBy, reason, notes } = params;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { passenger: true, driver: true },
    });

    if (!service) throw new NotFoundError('Servicio no encontrado');

    const nextStatus =
      cancelledBy === 'CUSTOMER'
        ? ServiceStatus.CANCELLED_BY_CUSTOMER
        : ServiceStatus.CANCELLED_BY_DRIVER;

    ServiceStateMachine.validateTransition(service.status, nextStatus);

    // Registrar cancelación en tabla dedicada
    await prisma.cancellation.create({
      data: {
        serviceId,
        driverId: service.driverId,
        source: cancelledBy as CancellationSource,
        reason,
        notes,
      },
    });

    // Actualizar estado del servicio
    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: nextStatus,
        cancelledAt: new Date(),
      },
      include: { passenger: true, driver: true },
    });

    // Si había un conductor asignado, liberarlo e incrementar métrica de cancelación si fue por conductor
    if (service.driverId) {
      await prisma.driver.update({
        where: { id: service.driverId },
        data: {
          status: DriverStatus.AVAILABLE,
          ...(cancelledBy === 'DRIVER' ? { cancelledServicesCount: { increment: 1 } } : {}),
        },
      });
    }

    await prisma.serviceEvent.create({
      data: {
        serviceId,
        statusFrom: service.status,
        statusTo: nextStatus,
        triggeredBy: `${cancelledBy}:${params.passengerId || params.driverId || 'ADMIN'}`,
        payload: { reason, notes },
      },
    });

    // REGLA CLAVE: Si el conductor cancela antes de recoger al pasajero, reactivar el Dispatch Engine
    if (
      cancelledBy === 'DRIVER' &&
      ([ServiceStatus.DRIVER_ACCEPTED, ServiceStatus.CONFIRMED, ServiceStatus.DRIVER_EN_ROUTE] as ServiceStatus[]).includes(service.status)
    ) {
      logger.info(`Conductor canceló servicio ${service.publicCode}. Reactivando Dispatch Engine.`);
      
      const reactivated = await prisma.service.update({
        where: { id: serviceId },
        data: {
          status: ServiceStatus.SEARCHING_DRIVER,
          driverId: null,
          cancelledAt: null,
        },
      });

      await WhatsAppClient.sendTextMessage(
        service.passenger.phone,
        '⚠️ Tu conductor tuvo un inconveniente imprevisto.\n\n🚕 Estamos buscando un nuevo conductor cercano de inmediato para ti.'
      );

      // Reactivar búsqueda
      RoundsManager.executeRound(reactivated.id, 1).catch((err) => {
        logger.error('Error al reactivar rondas', { error: err.message });
      });

      return reactivated;
    }

    // Notificaciones de cancelación
    if (cancelledBy === 'CUSTOMER' && service.driver) {
      await WhatsAppClient.sendTextMessage(
        service.driver.phone,
        `❌ El servicio ${service.publicCode} fue cancelado por el pasajero.\nMotivo: ${reason}`
      );
    } else if (cancelledBy === 'CUSTOMER') {
      await WhatsAppClient.sendTextMessage(
        service.passenger.phone,
        `✅ Tu solicitud de servicio ha sido cancelada correctamente.`
      );
    }

    return updated;
  }

  /**
   * Asignación Manual de Emergencia por el Administrador
   */
  public static async manualEmergencyAssign(serviceId: string, driverId: string, adminUserId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { passenger: true },
    });

    if (!service) throw new NotFoundError('Servicio no encontrado');

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { vehicle: true },
    });

    if (!driver) throw new NotFoundError('Conductor no encontrado');

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        driverId,
        status: ServiceStatus.CONFIRMED,
        assignedAt: new Date(),
      },
      include: { passenger: true, driver: { include: { vehicle: true } } },
    });

    await prisma.driver.update({
      where: { id: driverId },
      data: { status: DriverStatus.BUSY },
    });

    await prisma.serviceEvent.create({
      data: {
        serviceId,
        statusFrom: service.status,
        statusTo: ServiceStatus.CONFIRMED,
        triggeredBy: `ADMIN:${adminUserId}`,
        payload: { action: 'EMERGENCY_MANUAL_DISPATCH', driverId },
      },
    });

    // Notificar al conductor asignado por despacho
    const driverMsg =
      `🚨 *SERVICIO ASIGNADO POR DESPACHO*\n\n` +
      `👤 *Pasajero:* ${service.passenger.name || 'Pasajero'}\n` +
      `📞 *Teléfono:* ${service.passenger.phone}\n` +
      `📍 *Recogida:* ${service.originAddress}\n` +
      `🎯 *Destino:* ${service.destinationAddress}\n` +
      `👥 *Pasajeros:* ${service.passengersCount}\n` +
      `📝 *Observación:* ${service.notes || 'Ninguna'}\n\n` +
      `Por favor dirígete de inmediato al punto de recogida.`;

    await WhatsAppClient.sendTextMessage(driver.phone, driverMsg);

    // Notificar al pasajero
    await WhatsAppClient.sendServiceConfirmed({
      passengerPhone: service.passenger.phone,
      driverPhone: driver.phone,
      driverName: driver.name,
      vehicleBrandModel: `${driver.vehicle?.brand} ${driver.vehicle?.model}`,
      licensePlate: driver.vehicle?.licensePlate || '',
      originAddress: service.originAddress,
      destinationAddress: service.destinationAddress,
      etaMinutes: service.estimatedDurationMin || 8,
      passengersCount: service.passengersCount,
      notes: service.notes,
    });

    return updated;
  }
}
