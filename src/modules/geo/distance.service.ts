import { SYSTEM_CONSTANTS } from '../../config/constants';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  distanceKm: number;
  etaMinutes: number;
}

export class DistanceService {
  /**
   * Calcula la distancia ortodrómica en kilómetros utilizando la fórmula del Haversine
   */
  public static calculateHaversineKm(pointA: Coordinates, pointB: Coordinates): number {
    const R = SYSTEM_CONSTANTS.GPS.EARTH_RADIUS_KM;
    const dLat = this.deg2rad(pointB.latitude - pointA.latitude);
    const dLon = this.deg2rad(pointB.longitude - pointA.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(pointA.latitude)) *
        Math.cos(this.deg2rad(pointB.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistanceKm = R * c;

    // Multiplicador empírico de curvatura vial urbana (1.28x sobre distancia aérea)
    const urbanRoadFactor = 1.28;
    return parseFloat((straightDistanceKm * urbanRoadFactor).toFixed(2));
  }

  /**
   * Estima el tiempo de llegada (ETA) en minutos considerando velocidad promedio urbana
   */
  public static estimateEtaMinutes(distanceKm: number, averageSpeedKmh = SYSTEM_CONSTANTS.GPS.AVERAGE_CITY_SPEED_KMH): number {
    if (distanceKm <= 0.1) return 2; // Tiempo base mínimo de maniobra
    const hours = distanceKm / averageSpeedKmh;
    const minutes = Math.ceil(hours * 60) + 1; // +1 minuto de tráfico y semaforización
    return Math.max(2, minutes);
  }

  /**
   * Retorna distancia y ETA estimados entre dos puntos
   */
  public static getDistanceAndEta(origin: Coordinates, destination: Coordinates): DistanceResult {
    const distanceKm = this.calculateHaversineKm(origin, destination);
    const etaMinutes = this.estimateEtaMinutes(distanceKm);
    return { distanceKm, etaMinutes };
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
