import { SYSTEM_CONSTANTS } from '../../config/constants';
import { DriverReputationSummary, RatingDistribution, ReputationTier } from './types';

export class ReputationCalculator {
  /**
   * Calcula el promedio, distribución y nivel de reputación a partir de una lista de calificaciones
   */
  public static calculateFromRatings(
    ratings: Array<{ stars: number }>
  ): DriverReputationSummary {
    const totalCount = ratings.length;

    const distribution: RatingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    if (totalCount === 0) {
      return {
        ratingAverage: SYSTEM_CONSTANTS.REPUTATION.DEFAULT_RATING,
        ratingCount: 0,
        ratingDistribution: distribution,
        reputationTier: 'SIN_SUFICIENTE_INFORMACION',
        reputationLabel: 'Sin suficiente información',
        displayFormatted: '⭐ 5.0 · Nuevo conductor',
      };
    }

    let sumStars = 0;
    for (const r of ratings) {
      const star = Math.min(5, Math.max(1, Math.round(r.stars))) as 1 | 2 | 3 | 4 | 5;
      distribution[star] = (distribution[star] || 0) + 1;
      sumStars += star;
    }

    const ratingAverage = parseFloat((sumStars / totalCount).toFixed(2));
    const tier = this.resolveReputationTier(totalCount);

    return {
      ratingAverage,
      ratingCount: totalCount,
      ratingDistribution: distribution,
      reputationTier: tier.tier,
      reputationLabel: tier.label,
      displayFormatted: `⭐ ${ratingAverage.toFixed(1)} · ${totalCount.toLocaleString('es-CO')} calificaciones`,
    };
  }

  /**
   * Determina el tier de reputación según la cantidad de calificaciones acumuladas
   */
  public static resolveReputationTier(count: number): { tier: ReputationTier; label: string } {
    if (count < SYSTEM_CONSTANTS.REPUTATION.MIN_RATINGS_TIER_NEW) {
      return {
        tier: 'SIN_SUFICIENTE_INFORMACION',
        label: 'Sin suficiente información (< 20 viajes)',
      };
    }

    if (count < SYSTEM_CONSTANTS.REPUTATION.MIN_RATINGS_TIER_MONITORING) {
      return {
        tier: 'MONITOREO',
        label: 'Monitoreo activo (20-50 viajes)',
      };
    }

    return {
      tier: 'CONSOLIDADA',
      label: 'Reputación consolidada (50+ viajes)',
    };
  }

  /**
   * Formatea la presentación obligatoria: "⭐ 4.9 · 1.248 calificaciones"
   */
  public static formatDisplay(ratingAverage: number, ratingCount: number): string {
    if (ratingCount === 0) {
      return '⭐ 5.0 · Conductor nuevo';
    }
    return `⭐ ${ratingAverage.toFixed(1)} · ${ratingCount.toLocaleString('es-CO')} calificaciones`;
  }
}
