import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors/app-error';
import { ReputationCalculator } from './reputation.calc';
import { SYSTEM_CONSTANTS } from '../../config/constants';
import { logger } from '../../lib/logger';
import { ServiceStatus } from '@prisma/client';

export interface SubmitRatingDto {
  serviceId: string;
  passengerId: string;
  stars: number;
  feedbackTag?: string;
  comment?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class RatingService {
  /**
   * Registra una calificación de pasajero a conductor con todas las reglas de negocio
   */
  public static async submitRating(dto: SubmitRatingDto) {
    const { serviceId, passengerId, stars, feedbackTag, comment, ipAddress, userAgent } = dto;

    if (stars < 1 || stars > 5 || !Number.isInteger(stars)) {
      throw new ValidationError('La calificación debe ser un número entero entre 1 y 5 estrellas.');
    }

    // 1. Obtener y verificar el servicio
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        driver: true,
        rating: true,
      },
    });

    if (!service) {
      throw new NotFoundError(`Servicio con ID ${serviceId} no encontrado.`);
    }

    // 2. Solo permitir calificar servicios COMPLETED
    if (service.status !== ServiceStatus.COMPLETED) {
      throw new ConflictError(
        `Solo es posible calificar servicios finalizados. El estado actual es [${service.status}].`
      );
    }

    // 3. Verificar que el pasajero sea el titular del servicio
    if (service.passengerId !== passengerId) {
      throw new ConflictError('Solo el pasajero titular de este servicio puede registrar la calificación.');
    }

    // 4. Verificar que no exista calificación previa
    if (service.rating) {
      throw new ConflictError('Este servicio ya ha sido calificado previamente.');
    }

    if (!service.driverId) {
      throw new ConflictError('El servicio no cuenta con un conductor asignado.');
    }

    const driverId = service.driverId;

    // 5. Crear la calificación en base de datos
    const newRating = await prisma.rating.create({
      data: {
        serviceId,
        passengerId,
        driverId,
        stars,
        feedbackTag,
        comment,
        ipAddress,
        userAgent,
      },
    });

    logger.info('Calificación registrada con éxito', {
      serviceId,
      driverId,
      stars,
      feedbackTag,
    });

    // 6. Recalcular métricas de reputación del conductor
    await this.recalculateDriverReputation(driverId);

    // 7. Alerta de calidad automática para 1 o 2 estrellas
    if (SYSTEM_CONSTANTS.REPUTATION.ALERT_STAR_THRESHOLDS.includes(stars)) {
      await prisma.qualityAlert.create({
        data: {
          driverId,
          serviceId,
          stars,
          reason: `Calificación baja de ${stars} estrellas recibida por el conductor. Motivo/Tag: ${
            feedbackTag || 'Sin etiqueta'
          }. Comentario: ${comment || 'Sin comentario'}.`,
        },
      });

      logger.warn('⚠️ ALERTA DE CALIDAD REGISTRADA', {
        driverId,
        serviceId,
        stars,
        publicCode: service.publicCode,
      });
    }

    return newRating;
  }

  /**
   * Recalcula el promedio, conteo y distribución de estrellas de un conductor
   */
  public static async recalculateDriverReputation(driverId: string) {
    const ratings = await prisma.rating.findMany({
      where: { driverId },
      select: { stars: true },
    });

    const summary = ReputationCalculator.calculateFromRatings(ratings);

    await prisma.driver.update({
      where: { id: driverId },
      data: {
        ratingAverage: summary.ratingAverage,
        ratingCount: summary.ratingCount,
        ratingDistribution: summary.ratingDistribution as any,
      },
    });

    return summary;
  }

  /**
   * Consulta las calificaciones para el conductor (Anonimizadas)
   * El conductor NO puede ver datos del pasajero
   */
  public static async getDriverAnonymousRatings(driverId: string) {
    const ratings = await prisma.rating.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        stars: true,
        feedbackTag: true,
        comment: true,
        createdAt: true,
      },
    });

    return ratings;
  }

  /**
   * Consulta para administradores con soporte de filtros
   */
  public static async getAdminReputationOverview(filters?: {
    driverId?: string;
    minStars?: number;
    maxStars?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const whereClause: Record<string, unknown> = {};

    if (filters?.driverId) whereClause.driverId = filters.driverId;
    if (filters?.minStars || filters?.maxStars) {
      whereClause.stars = {
        ...(filters.minStars ? { gte: filters.minStars } : {}),
        ...(filters.maxStars ? { lte: filters.maxStars } : {}),
      };
    }

    const ratings = await prisma.rating.findMany({
      where: whereClause,
      include: {
        driver: {
          select: { id: true, name: true, phone: true },
        },
        passenger: {
          select: { id: true, name: true, phone: true },
        },
        service: {
          select: { id: true, publicCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const alerts = await prisma.qualityAlert.findMany({
      where: { isResolved: false },
      include: {
        driver: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { ratings, alerts };
  }
}
