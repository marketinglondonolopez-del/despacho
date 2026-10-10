import { describe, it, expect } from 'vitest';
import { DispatchEngine, DriverCandidate } from '../modules/dispatch/dispatch.engine';
import { Coordinates } from '../modules/geo/distance.service';

describe('DispatchEngine (Scoring & Ranking)', () => {
  const pickupLocation: Coordinates = {
    latitude: 3.4578, // Barrio Granada
    longitude: -76.5332,
  };

  const mockDrivers: DriverCandidate[] = [
    {
      id: 'driver-close',
      userId: null,
      name: 'Carlos Cercano',
      phone: '573001111111',
      nationalId: '1001',
      photoUrl: null,
      status: 'AVAILABLE',
      currentLatitude: 3.4580, // A 150 metros
      currentLongitude: -76.5330,
      lastLocationUpdate: new Date(),
      isLocationStale: false,
      ratingAverage: 4.9,
      ratingCount: 120,
      ratingDistribution: {},
      completedServicesCount: 200,
      cancelledServicesCount: 2,
      acceptanceRate: 0.98,
      avgEtaMinutes: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      vehicle: {
        id: 'veh-1',
        driverId: 'driver-close',
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
    },
    {
      id: 'driver-far',
      userId: null,
      name: 'Felipe Lejano',
      phone: '573002222222',
      nationalId: '1002',
      photoUrl: null,
      status: 'AVAILABLE',
      currentLatitude: 3.4800, // A varios kilómetros
      currentLongitude: -76.5200,
      lastLocationUpdate: new Date(),
      isLocationStale: false,
      ratingAverage: 4.8,
      ratingCount: 50,
      ratingDistribution: {},
      completedServicesCount: 80,
      cancelledServicesCount: 1,
      acceptanceRate: 0.95,
      avgEtaMinutes: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      vehicle: {
        id: 'veh-2',
        driverId: 'driver-far',
        brand: 'Chevrolet',
        model: 'Onix',
        licensePlate: 'XYZ789',
        color: 'Blanco',
        category: 'BASICO',
        seats: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'driver-stale',
      userId: null,
      name: 'Mario GPS Obsoleto',
      phone: '573003333333',
      nationalId: '1003',
      photoUrl: null,
      status: 'AVAILABLE',
      currentLatitude: 3.4582, // Cerca pero con GPS sin actualizar hace 5 minutos
      currentLongitude: -76.5331,
      lastLocationUpdate: new Date(Date.now() - 300000),
      isLocationStale: true,
      ratingAverage: 4.9,
      ratingCount: 80,
      ratingDistribution: {},
      completedServicesCount: 100,
      cancelledServicesCount: 0,
      acceptanceRate: 0.99,
      avgEtaMinutes: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      vehicle: {
        id: 'veh-3',
        driverId: 'driver-stale',
        brand: 'Nissan',
        model: 'Versa',
        licensePlate: 'JKL456',
        color: 'Negro',
        category: 'BASICO',
        seats: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ];

  it('ordena al conductor más cercano y actualizado en primer lugar', () => {
    const ranked = DispatchEngine.scoreAndRankCandidates(mockDrivers, pickupLocation, {
      maxRadiusKm: 10.0,
      minSeats: 1,
    });

    expect(ranked.length).toBeGreaterThan(0);
    // El conductor más cercano y con GPS fresco debe tener el menor score (primer puesto)
    expect(ranked[0].driver.id).toBe('driver-close');
    expect(ranked[0].isStale).toBe(false);
  });

  it('penaliza severamente a conductores con GPS obsoleto (stale)', () => {
    const ranked = DispatchEngine.scoreAndRankCandidates(mockDrivers, pickupLocation, {
      maxRadiusKm: 10.0,
      minSeats: 1,
    });

    const closeDriver = ranked.find((c) => c.driver.id === 'driver-close');
    const staleDriver = ranked.find((c) => c.driver.id === 'driver-stale');

    expect(closeDriver).toBeDefined();
    expect(staleDriver).toBeDefined();
    // A pesar de estar a distancia similar, el stale sufre penalización en score
    expect(staleDriver!.score).toBeGreaterThan(closeDriver!.score);
  });
});
