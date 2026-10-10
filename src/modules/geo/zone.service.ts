import { Coordinates } from './distance.service';

export interface ZonePolygon {
  name: string;
  points: Coordinates[];
}

export class ZoneService {
  /**
   * Algoritmo Ray-Casting para determinar si un punto se encuentra dentro de un polígono geográfico
   */
  public static isPointInPolygon(point: Coordinates, polygon: Coordinates[]): boolean {
    let isInside = false;
    const x = point.longitude;
    const y = point.latitude;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) isInside = !isInside;
    }

    return isInside;
  }
}
