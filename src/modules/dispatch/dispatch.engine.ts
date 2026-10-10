import { Coordinates, DistanceService } from '../geo/distance.service';
import { SYSTEM_CONSTANTS } from '../../config/constants';
import { Driver, Vehicle, VehicleCategory } from '@prisma/client';

export interface DriverCandidate extends Driver {
  vehicle: Vehicle | null;
}

export interface ScoredDriverCandidate {
  driver: DriverCandidate;
  distanceKm: number;
  etaMinutes: number;
  score: number;
  isStale: boolean;
}

export class DispatchEngine {
  /**
   * Evalúa y puntúa a los conductores disponibles según el modelo multicriterio
   */
  public static scoreAndRankCandidates(
    candidates: DriverCandidate[],
    pickupLocation: Coordinates,
    options?: {
      maxRadiusKm?: number;
      minSeats?: number;
      category?: VehicleCategory;
    }
  ): ScoredDriverCandidate[] {
    const maxRadius = options?.maxRadiusKm ?? SYSTEM_CONSTANTS.ROUNDS.ROUND_1.INITIAL_RADIUS_KM;
    const minSeats = options?.minSeats ?? 1;
    const category = options?.category;
    const weights = SYSTEM_CONSTANTS.DISPATCH_WEIGHTS;

    const scored: ScoredDriverCandidate[] = [];

    for (const driver of candidates) {
      if (!driver.currentLatitude || !driver.currentLongitude) continue;

      // Filtro de capacidad del vehículo
      if (driver.vehicle && driver.vehicle.seats < minSeats) continue;

      // Filtro de categoría de vehículo si se solicita una específica
      if (category && driver.vehicle && driver.vehicle.category !== category) continue;

      // Cálculo de distancia y ETA
      const driverCoords: Coordinates = {
        latitude: driver.currentLatitude,
        longitude: driver.currentLongitude,
      };

      const { distanceKm, etaMinutes } = DistanceService.getDistanceAndEta(driverCoords, pickupLocation);

      // Descartar si excede el radio de la ronda actual
      if (distanceKm > maxRadius) continue;

      // Penalización por señal GPS obsoleta (> 45s)
      const isStale =
        driver.isLocationStale ||
        (driver.lastLocationUpdate
          ? Date.now() - new Date(driver.lastLocationUpdate).getTime() >
            SYSTEM_CONSTANTS.GPS.STALE_THRESHOLD_SECONDS * 1000
          : true);

      const stalePenalty = isStale ? weights.STALE_PENALTY : 0;

      // Inverso del rating (menor penalización para mayor rating)
      const ratingDeficit = Math.max(0, 5.0 - (driver.ratingAverage || 5.0));

      // Inverso de tasa de aceptación
      const acceptanceDeficit = Math.max(0, 1.0 - (driver.acceptanceRate || 1.0));

      // Fórmula compuesta de scoring (MENOR puntaje = MEJOR candidato)
      const score =
        weights.DISTANCE * distanceKm +
        weights.ETA * (etaMinutes / 2) +
        weights.RATING * ratingDeficit +
        weights.ACCEPTANCE_RATE * acceptanceDeficit * 2 +
        stalePenalty;

      scored.push({
        driver,
        distanceKm,
        etaMinutes,
        score: parseFloat(score.toFixed(3)),
        isStale,
      });
    }

    // Ordenar de menor a mayor score (los más idóneos primero)
    return scored.sort((a, b) => a.score - b.score);
  }
}
