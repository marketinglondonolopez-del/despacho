export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export type ReputationTier = 'SIN_SUFICIENTE_INFORMACION' | 'MONITOREO' | 'CONSOLIDADA';

export interface DriverReputationSummary {
  ratingAverage: number;
  ratingCount: number;
  ratingDistribution: RatingDistribution;
  reputationTier: ReputationTier;
  reputationLabel: string;
  displayFormatted: string; // Ej: "⭐ 4.9 · 1.248 calificaciones"
}

export const FEEDBACK_TAGS = [
  'Excelente servicio',
  'Muy buen conductor',
  'Amable',
  'Llegó a tiempo',
  'Vehículo limpio',
  'Tuvo demora',
  'Mala experiencia',
  'Otro comentario',
] as const;

export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];
