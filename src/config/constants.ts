export const SYSTEM_CONSTANTS = {
  // Configuración de Rondas de Despacho
  ROUNDS: {
    ROUND_1: {
      DRIVER_COUNT: 3,
      TIMEOUT_SECONDS: 15,
      INITIAL_RADIUS_KM: 2.0,
    },
    ROUND_2: {
      DRIVER_COUNT: 5,
      TIMEOUT_SECONDS: 20,
      RADIUS_KM: 4.0,
    },
    ROUND_3: {
      DRIVER_COUNT: 10,
      TIMEOUT_SECONDS: 25,
      RADIUS_KM: 8.0,
    },
  },

  // Pesos del algoritmo de puntuación (Scoring) del Dispatch Engine
  DISPATCH_WEIGHTS: {
    DISTANCE: 1.0,         // Menor distancia = menor score (mejor)
    ETA: 0.8,              // Menor ETA = menor score
    RATING: 1.5,           // Mayor rating = mayor reducción del score
    ACCEPTANCE_RATE: 1.2,  // Mayor tasa de aceptación = menor score
    STALE_PENALTY: 3.0,    // Penalización severa si el GPS supera 45s
  },

  // Geolocalización
  GPS: {
    STALE_THRESHOLD_SECONDS: 45,
    EARTH_RADIUS_KM: 6371,
    AVERAGE_CITY_SPEED_KMH: 25, // Velocidad promedio en ciudad para estimar ETA
  },

  // Reputación y Calificaciones
  REPUTATION: {
    MIN_RATINGS_TIER_NEW: 20,        // Menos de 20: "Sin suficiente información"
    MIN_RATINGS_TIER_MONITORING: 50, // 20 a 50: "Monitoreo"
    // 50+: "Reputación consolidada"
    ALERT_STAR_THRESHOLDS: [1, 2],   // Calificaciones que disparan alerta inmediata
    DEFAULT_RATING: 5.0,
  },

  // WhatsApp Meta API
  WHATSAPP: {
    MAX_BUTTONS_PER_MESSAGE: 3,
    MAX_LIST_ROWS_PER_SECTION: 10,
    WEBHOOK_RESPONSE_TIMEOUT_MS: 2000,
  },
};
