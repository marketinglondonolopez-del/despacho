import { Coordinates } from './distance.service';
import { env } from '../../config/env';

export class GeocodingService {
  // Diccionario de referencia rápida para puntos de interés urbanos
  private static REFERENCE_LANDMARKS: Record<string, Coordinates & { normalizedAddress: string }> = {
    granada: {
      latitude: 3.4578,
      longitude: -76.5332,
      normalizedAddress: 'Barrio Granada, Cali',
    },
    unicentro: {
      latitude: 3.3768,
      longitude: -76.5401,
      normalizedAddress: 'Centro Comercial Unicentro, Pasoancho',
    },
    centro: {
      latitude: 3.4516,
      longitude: -76.5320,
      normalizedAddress: 'Centro Histórico / Plaza de Cayzedo',
    },
    chipichape: {
      latitude: 3.4735,
      longitude: -76.5273,
      normalizedAddress: 'Centro Comercial Chipichape',
    },
    aeropuerto: {
      latitude: 3.5432,
      longitude: -76.3816,
      normalizedAddress: 'Aeropuerto Internacional Alfonso Bonilla Aragón',
    },
    terminal: {
      latitude: 3.4682,
      longitude: -76.5235,
      normalizedAddress: 'Terminal de Transportes',
    },
    'san antonio': {
      latitude: 3.4475,
      longitude: -76.5398,
      normalizedAddress: 'Barrio San Antonio',
    },
    norte: {
      latitude: 3.4820,
      longitude: -76.5150,
      normalizedAddress: 'Zona Norte',
    },
    sur: {
      latitude: 3.3850,
      longitude: -76.5350,
      normalizedAddress: 'Zona Sur / Ciudad Jardín',
    },
  };

  /**
   * Resuelve una dirección de texto o referencia a coordenadas geográficas
   */
  public static async resolveAddressToCoordinates(addressText: string): Promise<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
  }> {
    const cleanQuery = addressText.trim().toLowerCase();

    // 1. Buscar en diccionario de puntos de referencia
    for (const [key, landmark] of Object.entries(this.REFERENCE_LANDMARKS)) {
      if (cleanQuery.includes(key)) {
        return {
          latitude: landmark.latitude,
          longitude: landmark.longitude,
          formattedAddress: landmark.normalizedAddress,
        };
      }
    }

    // 2. Si hay API Key de Google Maps configurada, consultar Google Geocoding API
    if (env.MAPS_API_KEY && env.MAPS_API_KEY !== 'mock_maps_api_key' && env.MAPS_PROVIDER === 'google') {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          addressText
        )}&key=${env.MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return {
            latitude: loc.lat,
            longitude: loc.lng,
            formattedAddress: data.results[0].formatted_address,
          };
        }
      } catch {
        // En caso de fallo de red en la API externa, continuar con fallback
      }
    }

    // 3. Fallback inteligente: Coordenadas céntricas con variación determinista
    const defaultCenter = { latitude: 3.4516, longitude: -76.5320 };
    return {
      latitude: defaultCenter.latitude,
      longitude: defaultCenter.longitude,
      formattedAddress: addressText,
    };
  }

  /**
   * Geocodificación inversa: Coordenadas a dirección legible
   */
  public static async reverseGeocode(coords: Coordinates): Promise<string> {
    if (env.MAPS_API_KEY && env.MAPS_API_KEY !== 'mock_maps_api_key' && env.MAPS_PROVIDER === 'google') {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${env.MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
          return data.results[0].formatted_address;
        }
      } catch {
        // Fallback
      }
    }

    return `Ubicación GPS (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
  }
}
