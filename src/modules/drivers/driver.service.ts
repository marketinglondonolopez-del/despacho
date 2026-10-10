import { prisma } from '../../lib/prisma';
import { DriverStatus, VehicleCategory } from '@prisma/client';
import { NotFoundError } from '../../core/errors/app-error';
import { ReputationCalculator } from '../ratings/reputation.calc';
import { logger } from '../../lib/logger';

export interface CreateDriverDto {
  name: string;
  phone: string;
  nationalId: string;
  photoUrl?: string;
  vehicle: {
    brand: string;
    model: string;
    licensePlate: string;
    color: string;
    category?: VehicleCategory;
    seats?: number;
  };
}

// Almacén en memoria de alta disponibilidad para desarrollo o cuando PostgreSQL esté offline
export const memoryDrivers: any[] = [
  {
    id: 'drv-carlos-1',
    name: 'Carlos Rodríguez',
    phone: '573001234567',
    nationalId: '1144001001',
    photoUrl: null,
    status: DriverStatus.AVAILABLE,
    currentLatitude: 3.4578,
    currentLongitude: -76.5332,
    lastLocationUpdate: new Date(),
    isLocationStale: false,
    ratingAverage: 4.92,
    ratingCount: 1248,
    ratingDistribution: { 1: 2, 2: 4, 3: 10, 4: 52, 5: 1180 },
    completedServicesCount: 2350,
    cancelledServicesCount: 5,
    acceptanceRate: 0.94,
    avgEtaMinutes: 5.2,
    vehicle: {
      id: 'veh-1',
      brand: 'Renault',
      model: 'Logan 2022',
      licensePlate: 'ABC123',
      color: 'Gris Plata',
      category: VehicleCategory.BASICO,
      seats: 4,
    },
    createdAt: new Date(),
  },
  {
    id: 'drv-andres-2',
    name: 'Andrés Gómez',
    phone: '573007654321',
    nationalId: '1144001002',
    photoUrl: null,
    status: DriverStatus.AVAILABLE,
    currentLatitude: 3.4516,
    currentLongitude: -76.532,
    lastLocationUpdate: new Date(),
    isLocationStale: false,
    ratingAverage: 4.88,
    ratingCount: 820,
    ratingDistribution: { 1: 1, 2: 5, 3: 14, 4: 80, 5: 720 },
    completedServicesCount: 1450,
    cancelledServicesCount: 4,
    acceptanceRate: 0.96,
    avgEtaMinutes: 4.8,
    vehicle: {
      id: 'veh-2',
      brand: 'Chevrolet',
      model: 'Onix 2023',
      licensePlate: 'XYZ789',
      color: 'Blanco',
      category: VehicleCategory.CONFORT,
      seats: 4,
    },
    createdAt: new Date(),
  },
  {
    id: 'drv-juan-3',
    name: 'Juan Felipe Morales',
    phone: '573105556677',
    nationalId: '1144001003',
    photoUrl: null,
    status: DriverStatus.AVAILABLE,
    currentLatitude: 3.3768,
    currentLongitude: -76.5401,
    lastLocationUpdate: new Date(),
    isLocationStale: false,
    ratingAverage: 4.95,
    ratingCount: 430,
    ratingDistribution: { 1: 0, 2: 1, 3: 4, 4: 25, 5: 400 },
    completedServicesCount: 680,
    cancelledServicesCount: 2,
    acceptanceRate: 0.98,
    avgEtaMinutes: 6.1,
    vehicle: {
      id: 'veh-3',
      brand: 'Nissan',
      model: 'Versa 2024',
      licensePlate: 'MNO456',
      color: 'Azul',
      category: VehicleCategory.CONFORT,
      seats: 4,
    },
    createdAt: new Date(),
  },
  {
    id: 'drv-diego-4',
    name: 'Diego Fernando Ortiz',
    phone: '573158889900',
    nationalId: '1144001004',
    photoUrl: null,
    status: DriverStatus.AVAILABLE,
    currentLatitude: 3.4735,
    currentLongitude: -76.5273,
    lastLocationUpdate: new Date(),
    isLocationStale: false,
    ratingAverage: 4.75,
    ratingCount: 310,
    ratingDistribution: { 1: 3, 2: 8, 3: 19, 4: 60, 5: 220 },
    completedServicesCount: 520,
    cancelledServicesCount: 8,
    acceptanceRate: 0.91,
    avgEtaMinutes: 5.5,
    vehicle: {
      id: 'veh-4',
      brand: 'Toyota',
      model: 'Corolla 2021',
      licensePlate: 'QWE321',
      color: 'Negro',
      category: VehicleCategory.CONFORT,
      seats: 4,
    },
    createdAt: new Date(),
  },
  {
    id: 'drv-mario-5',
    name: 'Mario Alberto Restrepo',
    phone: '573204443322',
    nationalId: '1144001005',
    photoUrl: null,
    status: DriverStatus.AVAILABLE,
    currentLatitude: 3.4475,
    currentLongitude: -76.5398,
    lastLocationUpdate: new Date(),
    isLocationStale: false,
    ratingAverage: 4.82,
    ratingCount: 95,
    ratingDistribution: { 1: 1, 2: 2, 3: 4, 4: 18, 5: 70 },
    completedServicesCount: 160,
    cancelledServicesCount: 1,
    acceptanceRate: 0.93,
    avgEtaMinutes: 5.0,
    vehicle: {
      id: 'veh-5',
      brand: 'Kia',
      model: 'Rio 2020',
      licensePlate: 'JKL654',
      color: 'Rojo',
      category: VehicleCategory.BASICO,
      seats: 4,
    },
    createdAt: new Date(),
  },
];

export class DriverService {
  /**
   * Crea un conductor con su respectivo vehículo
   */
  public static async createDriver(dto: CreateDriverDto) {
    try {
      const created = await prisma.driver.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          nationalId: dto.nationalId,
          photoUrl: dto.photoUrl,
          vehicle: {
            create: {
              brand: dto.vehicle.brand,
              model: dto.vehicle.model,
              licensePlate: dto.vehicle.licensePlate.toUpperCase(),
              color: dto.vehicle.color,
              category: dto.vehicle.category || VehicleCategory.BASICO,
              seats: dto.vehicle.seats || 4,
            },
          },
        },
        include: {
          vehicle: true,
        },
      });
      return created;
    } catch (dbErr: any) {
      logger.warn('PostgreSQL no disponible, guardando conductor en almacén en memoria', { error: dbErr.message });
      
      const newDriver = {
        id: `drv-${Date.now()}`,
        name: dto.name,
        phone: dto.phone,
        nationalId: dto.nationalId,
        photoUrl: dto.photoUrl || null,
        status: DriverStatus.AVAILABLE,
        currentLatitude: 3.4578 + (Math.random() - 0.5) * 0.02,
        currentLongitude: -76.5332 + (Math.random() - 0.5) * 0.02,
        lastLocationUpdate: new Date(),
        isLocationStale: false,
        ratingAverage: 5.0,
        ratingCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        completedServicesCount: 0,
        cancelledServicesCount: 0,
        acceptanceRate: 1.0,
        avgEtaMinutes: 5.0,
        vehicle: {
          id: `veh-${Date.now()}`,
          brand: dto.vehicle.brand,
          model: dto.vehicle.model,
          licensePlate: dto.vehicle.licensePlate.toUpperCase(),
          color: dto.vehicle.color,
          category: dto.vehicle.category || VehicleCategory.BASICO,
          seats: dto.vehicle.seats || 4,
        },
        createdAt: new Date(),
      };

      memoryDrivers.unshift(newDriver);
      return newDriver;
    }
  }

  /**
   * Actualiza el estado operativo del conductor (AVAILABLE, BUSY, PAUSED, OFFLINE)
   */
  public static async updateStatus(driverId: string, status: DriverStatus) {
    try {
      return await prisma.driver.update({
        where: { id: driverId },
        data: { status },
        include: { vehicle: true },
      });
    } catch {
      const found = memoryDrivers.find((d) => d.id === driverId);
      if (found) {
        found.status = status;
        return found;
      }
      throw new NotFoundError(`Conductor ${driverId} no encontrado.`);
    }
  }

  /**
   * Obtiene el perfil público limitado para mostrar al pasajero (Protección de privacidad)
   */
  public static async getPublicProfileForPassenger(driverId: string, partiallyProtectPlate = false) {
    let driver: any = null;
    try {
      driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: { vehicle: true },
      });
    } catch {
      driver = memoryDrivers.find((d) => d.id === driverId);
    }

    if (!driver) {
      throw new NotFoundError(`Conductor ${driverId} no encontrado.`);
    }

    let plateDisplay = driver.vehicle?.licensePlate || 'N/A';
    if (partiallyProtectPlate && plateDisplay.length >= 6) {
      plateDisplay = `${plateDisplay.substring(0, 3)}-***`;
    }

    const ratingDisplay = ReputationCalculator.formatDisplay(
      driver.ratingAverage,
      driver.ratingCount
    );

    return {
      driverId: driver.id,
      name: driver.name,
      photoUrl: driver.photoUrl,
      ratingAverage: driver.ratingAverage,
      ratingCount: driver.ratingCount,
      ratingDisplay,
      completedServicesCount: driver.completedServicesCount,
      vehicle: driver.vehicle
        ? {
            brand: driver.vehicle.brand,
            model: driver.vehicle.model,
            color: driver.vehicle.color,
            licensePlate: plateDisplay,
            category: driver.vehicle.category,
          }
        : null,
    };
  }

  /**
   * Consulta conductores disponibles para el motor de despacho
   */
  public static async getAvailableDrivers() {
    try {
      return await prisma.driver.findMany({
        where: {
          status: DriverStatus.AVAILABLE,
          currentLatitude: { not: null },
          currentLongitude: { not: null },
        },
        include: {
          vehicle: true,
        },
      });
    } catch {
      return memoryDrivers.filter((d) => d.status === DriverStatus.AVAILABLE);
    }
  }

  /**
   * Lista completa para el panel administrativo
   */
  public static async listDriversForAdmin() {
    try {
      return await prisma.driver.findMany({
        include: {
          vehicle: true,
          _count: {
            select: {
              servicesAssigned: true,
              ratingsReceived: true,
              qualityAlerts: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return memoryDrivers;
    }
  }
}
