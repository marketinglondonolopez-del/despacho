import { prisma } from '../../lib/prisma';
import { cacheService } from '../../lib/redis';
import { ServiceStatus, DriverStatus } from '@prisma/client';
import { logger } from '../../lib/logger';

export interface ClaimResult {
  success: boolean;
  reason?: 'ALREADY_ASSIGNED' | 'SERVICE_NOT_FOUND' | 'SERVICE_CANCELLED' | 'LOCK_BUSY' | 'INVALID_STATUS';
  message: string;
  service?: any;
}

export class AtomicClaimService {
  /**
   * Intenta tomar un servicio de forma atómica garantizando que solo un conductor gane la asignación
   */
  public static async claimService(serviceId: string, driverId: string): Promise<ClaimResult> {
    const lockKey = `lock:service:claim:${serviceId}`;
    const lockAcquired = await cacheService.acquireLock(lockKey, 4);

    if (!lockAcquired) {
      return {
        success: false,
        reason: 'LOCK_BUSY',
        message: 'Otro conductor está confirmando la solicitud en este preciso instante.',
      };
    }

    try {
      // Transacción interactiva para garantizar atomicidad e integridad
      const result = await prisma.$transaction(async (tx) => {
        const service = await tx.service.findUnique({
          where: { id: serviceId },
          include: { passenger: true, driver: true },
        });

        if (!service) {
          return {
            success: false,
            reason: 'SERVICE_NOT_FOUND' as const,
            message: 'El servicio no existe o fue retirado.',
          };
        }

        // Si ya tiene conductor asignado o no está en fase de oferta/búsqueda
        if (
          service.driverId ||
          (service.status !== ServiceStatus.SEARCHING_DRIVER &&
            service.status !== ServiceStatus.DRIVER_OFFERED)
        ) {
          return {
            success: false,
            reason: 'ALREADY_ASSIGNED' as const,
            message: '❌ SERVICIO YA ASIGNADO\n\nEste servicio acaba de ser asignado a otro conductor.',
          };
        }

        // 1. Asignar conductor y transicionar estado
        const updatedService = await tx.service.update({
          where: { id: serviceId },
          data: {
            driverId,
            status: ServiceStatus.DRIVER_ACCEPTED,
            assignedAt: new Date(),
          },
          include: {
            passenger: true,
            driver: {
              include: { vehicle: true },
            },
          },
        });

        // 2. Cambiar estado del conductor a BUSY
        await tx.driver.update({
          where: { id: driverId },
          data: { status: DriverStatus.BUSY },
        });

        // 3. Marcar la oferta ganadora como ACCEPTED y las demás ofertas como EXPIRED
        await tx.serviceOffer.updateMany({
          where: { serviceId, driverId },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        });

        await tx.serviceOffer.updateMany({
          where: { serviceId, driverId: { not: driverId }, status: 'PENDING' },
          data: { status: 'EXPIRED' },
        });

        // 4. Registrar evento inmutable en el historial del servicio
        await tx.serviceEvent.create({
          data: {
            serviceId,
            statusFrom: service.status,
            statusTo: ServiceStatus.DRIVER_ACCEPTED,
            triggeredBy: `DRIVER:${driverId}`,
            payload: { driverId, action: 'CLAIM_SERVICE_SUCCESS' },
          },
        });

        return {
          success: true,
          message: 'Servicio asignado exitosamente.',
          service: updatedService,
        };
      });

      return result;
    } catch (err: any) {
      logger.error('Error al procesar asignación atómica', { serviceId, driverId, error: err.message });
      return {
        success: false,
        reason: 'INVALID_STATUS',
        message: 'Ocurrió un error al procesar la asignación del servicio.',
      };
    } finally {
      await cacheService.releaseLock(lockKey);
    }
  }
}
