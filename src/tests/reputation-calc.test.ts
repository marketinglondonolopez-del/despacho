import { describe, it, expect } from 'vitest';
import { ReputationCalculator } from '../modules/ratings/reputation.calc';

describe('ReputationCalculator (Calificación y Métricas)', () => {
  it('calcula correctamente el promedio y distribución de estrellas a partir de calificaciones reales', () => {
    const sampleRatings = [
      { stars: 5 },
      { stars: 5 },
      { stars: 5 },
      { stars: 5 },
      { stars: 4 },
      { stars: 4 },
      { stars: 3 },
      { stars: 2 },
      { stars: 1 },
    ];

    const result = ReputationCalculator.calculateFromRatings(sampleRatings);

    expect(result.ratingCount).toBe(9);
    // Suma: 5*4 + 4*2 + 3 + 2 + 1 = 20 + 8 + 3 + 2 + 1 = 34. 34 / 9 = 3.78
    expect(result.ratingAverage).toBe(3.78);

    expect(result.ratingDistribution[5]).toBe(4);
    expect(result.ratingDistribution[4]).toBe(2);
    expect(result.ratingDistribution[3]).toBe(1);
    expect(result.ratingDistribution[2]).toBe(1);
    expect(result.ratingDistribution[1]).toBe(1);
  });

  it('asigna tiers de reputación según la cantidad de viajes acumulados', () => {
    // Menos de 20
    const tierNew = ReputationCalculator.resolveReputationTier(15);
    expect(tierNew.tier).toBe('SIN_SUFICIENTE_INFORMACION');

    // 20 a 50
    const tierMonitoring = ReputationCalculator.resolveReputationTier(35);
    expect(tierMonitoring.tier).toBe('MONITOREO');

    // Más de 50
    const tierConsolidated = ReputationCalculator.resolveReputationTier(120);
    expect(tierConsolidated.tier).toBe('CONSOLIDADA');
  });

  it('formatea la presentación de forma clara incluyendo número de calificaciones', () => {
    const formatted = ReputationCalculator.formatDisplay(4.92, 1248);
    // Debe incluir tanto el rating como el conteo con formato numérico
    expect(formatted).toContain('⭐ 4.9');
    expect(formatted).toContain('calificaciones');
  });
});
