import { describe, it, expect, vi } from 'vitest';
import { ServiceStateMachine } from '../core/state-machine/service-state-machine';
import { ServiceStatus } from '@prisma/client';
import { DispatchEngine, DriverCandidate } from '../modules/dispatch/dispatch.engine';
import { ReputationCalculator } from '../modules/ratings/reputation.calc';
import { DistanceService } from '../modules/geo/distance.service';

describe('E2E Flujo Completo de Despacho y Calificación', () => {
  it('ejecuta la secuencia completa desde la solicitud hasta la calificación final', () => {
    // 1. PASAJERO: Punto de recogida y destino
    const originCoords = { latitude: 3.4578, longitude: -76.5332 }; // Barrio Granada
    const destinationCoords = { latitude: 3.3768, longitude: -76.5401 }; // Unicentro

    const { distanceKm, etaMinutes } = DistanceService.getDistanceAndEta(originCoords, destinationCoords);
    expect(distanceKm).toBeGreaterThan(0);
    expect(etaMinutes).toBeGreaterThan(0);

    // 2. SERVICIO: Estado inicial CREATED -> SEARCHING_DRIVER
    let currentStatus: ServiceStatus = ServiceStatus.CREATED;
    expect(ServiceStateMachine.canTransition(currentStatus, ServiceStatus.SEARCHING_DRIVER)).toBe(true);
    currentStatus = ServiceStatus.SEARCHING_DRIVER;

    // 3. DISPATCH ENGINE: Localiza y clasifica conductores disponibles
    const mockDriver: DriverCandidate = {
      id: 'driver-test-1',
      userId: null,
      name: 'Carlos Rodríguez',
      phone: '573001234567',
      nationalId: '1144001',
      photoUrl: null,
      status: 'AVAILABLE',
      currentLatitude: 3.4585,
      currentLongitude: -76.5335,
      lastLocationUpdate: new Date(),
      isLocationStale: false,
      ratingAverage: 4.92,
      ratingCount: 1248,
      ratingDistribution: { 1: 2, 2: 4, 3: 10, 4: 52, 5: 1180 },
      completedServicesCount: 2350,
      cancelledServicesCount: 5,
      acceptanceRate: 0.94,
      avgEtaMinutes: 5.2,
      createdAt: new Date(),
      updatedAt: new Date(),
      vehicle: {
        id: 'veh-1',
        driverId: 'driver-test-1',
        brand: 'Renault',
        model: 'Logan',
        licensePlate: 'ABC123',
        color: 'Gris',
        category: 'BASICO',
        seats: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const rankedCandidates = DispatchEngine.scoreAndRankCandidates([mockDriver], originCoords, {
      maxRadiusKm: 5.0,
      minSeats: 1,
    });

    expect(rankedCandidates.length).toBe(1);
    expect(rankedCandidates[0].driver.name).toBe('Carlos Rodríguez');

    // 4. OFERTA: SEARCHING_DRIVER -> DRIVER_OFFERED
    expect(ServiceStateMachine.canTransition(currentStatus, ServiceStatus.DRIVER_OFFERED)).toBe(true);
    currentStatus = ServiceStatus.DRIVER_OFFERED;

    // 5. CONDUCTOR ACEPTA: DRIVER_OFFERED -> DRIVER_ACCEPTED
    expect(ServiceStateMachine.canTransition(currentStatus, ServiceStatus.DRIVER_ACCEPTED)).toBe(true);
    currentStatus = ServiceStatus.DRIVER_ACCEPTED;

    // 6. PASAJERO CONFIRMA: DRIVER_ACCEPTED -> CONFIRMED
    expect(ServiceStateMachine.canTransition(currentStatus, ServiceStatus.CONFIRMED)).toBe(true);
    currentStatus = ServiceStatus.CONFIRMED;

    // 7. CONDUCTOR LLEGA: CONFIRMED -> DRIVER_ARRIVED
    expect(ServiceStateMachine.canTransition(currentStatus, ServiceStatus.DRIVER_ARRIVED)).toBe(true);
    currentStatus = ServiceStatus.DRIVER_ARRIVED;

    // 8. INICIA VIAJE: DRIVER_ARRIVED -> IN_PROGRESS
    expect(ServiceStateMachine.canTransition(currentStatus, ServiceStatus.IN_PROGRESS)).toBe(true);
    currentStatus = ServiceStatus.IN_PROGRESS;

    // 9. FINALIZA VIAJE: IN_PROGRESS -> COMPLETED
    expect(ServiceStateMachine.canTransition(currentStatus, ServiceStatus.COMPLETED)).toBe(true);
    currentStatus = ServiceStatus.COMPLETED;
    expect(ServiceStateMachine.isTerminal(currentStatus)).toBe(true);

    // 10. PASAJERO CALIFICA 5 ESTRELLAS Y SE RECALCULA REPUTACIÓN
    const driverPreviousRatings = [
      { stars: 5 },
      { stars: 5 },
      { stars: 4 },
      { stars: 5 },
    ];
    // Se agrega la nueva calificación de 5 estrellas
    const updatedRatings = [...driverPreviousRatings, { stars: 5 }];
    const reputation = ReputationCalculator.calculateFromRatings(updatedRatings);

    expect(reputation.ratingCount).toBe(5);
    // (5*4 + 4) / 5 = 24 / 5 = 4.8
    expect(reputation.ratingAverage).toBe(4.8);
    expect(reputation.ratingDistribution[5]).toBe(4);
    expect(reputation.ratingDistribution[4]).toBe(1);
    expect(reputation.displayFormatted).toContain('⭐ 4.8');
    expect(reputation.displayFormatted).toContain('5 calificaciones');
  });
});
