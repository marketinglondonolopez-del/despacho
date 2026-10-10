import { prisma } from '../../lib/prisma';
import { SYSTEM_CONSTANTS } from '../../config/constants';
import { logger } from '../../lib/logger';
import { memoryDrivers } from './driver.service';

export interface UpdateLocationDto {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedKmh?: number;
  headingDeg?: number;
}

export class DriverLocationService {
  /**
   * Registra una actualización de ubicación del conductor
   */
  public static async updateLocation(dto: UpdateLocationDto) {
    const { driverId, latitude, longitude, accuracyMeters, speedKmh, headingDeg } = dto;
    const now = new Date();

    try {
      // 1. Actualizar conductor en PostgreSQL
      const driver = await prisma.driver.update({
        where: { id: driverId },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationUpdate: now,
          isLocationStale: false,
        },
      });

      // 2. Registrar en historial de ubicaciones
      await prisma.driverLocation.create({
        data: {
          driverId,
          latitude,
          longitude,
          accuracyMeters,
          speedKmh,
          headingDeg,
          timestamp: now,
        },
      });

      return driver;
    } catch {
      // Fallback en memoria si la BD no está corriendo
      const found = memoryDrivers.find((d) => d.id === driverId);
      if (found) {
        found.currentLatitude = latitude;
        found.currentLongitude = longitude;
        found.lastLocationUpdate = now;
        found.isLocationStale = false;
        return found;
      }
      return null;
    }
  }

  /**
   * Revisa conductores disponibles y marca como STALE aquellos sin señal reciente
   */
  public static async markStaleLocations() {
    const thresholdMs = SYSTEM_CONSTANTS.GPS.STALE_THRESHOLD_SECONDS * 1000;
    const cutoffTime = new Date(Date.now() - thresholdMs);

    try {
      const result = await prisma.driver.updateMany({
        where: {
          status: 'AVAILABLE',
          isLocationStale: false,
          OR: [
            { lastLocationUpdate: { lt: cutoffTime } },
            { lastLocationUpdate: null },
          ],
        },
        data: {
          isLocationStale: true,
        },
      });
      return result.count;
    } catch {
      let count = 0;
      for (const d of memoryDrivers) {
        if (d.status === 'AVAILABLE' && d.lastLocationUpdate && Date.now() - new Date(d.lastLocationUpdate).getTime() > thresholdMs) {
          d.isLocationStale = true;
          count++;
        }
      }
      return count;
    }
  }
}
