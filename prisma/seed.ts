import { PrismaClient, Role, DriverStatus, VehicleCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando datos base en PostgreSQL...');

  // 1. Crear Usuario Super Administrador
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dispatch.com' },
    update: {},
    create: {
      email: 'admin@dispatch.com',
      passwordHash: adminPasswordHash,
      name: 'Administrador Principal',
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(`👤 Administrador listo: ${admin.email}`);

  // 2. Crear Conductores Iniciales con Vehículos y Ubicaciones
  const driversData = [
    {
      name: 'Carlos Rodríguez',
      phone: '573001234567',
      nationalId: '1144001001',
      lat: 3.4578,
      lng: -76.5332,
      ratingAverage: 4.92,
      ratingCount: 1248,
      ratingDistribution: { 1: 2, 2: 4, 3: 10, 4: 52, 5: 1180 },
      completedServicesCount: 2350,
      acceptanceRate: 0.94,
      avgEtaMinutes: 5.2,
      vehicle: {
        brand: 'Renault',
        model: 'Logan 2022',
        licensePlate: 'ABC123',
        color: 'Gris Plata',
        category: VehicleCategory.BASICO,
        seats: 4,
      },
    },
    {
      name: 'Andrés Gómez',
      phone: '573007654321',
      nationalId: '1144001002',
      lat: 3.4516,
      lng: -76.5320,
      ratingAverage: 4.88,
      ratingCount: 820,
      ratingDistribution: { 1: 1, 2: 5, 3: 14, 4: 80, 5: 720 },
      completedServicesCount: 1450,
      acceptanceRate: 0.96,
      avgEtaMinutes: 4.8,
      vehicle: {
        brand: 'Chevrolet',
        model: 'Onix 2023',
        licensePlate: 'XYZ789',
        color: 'Blanco',
        category: VehicleCategory.CONFORT,
        seats: 4,
      },
    },
    {
      name: 'Juan Felipe Morales',
      phone: '573105556677',
      nationalId: '1144001003',
      lat: 3.3768,
      lng: -76.5401,
      ratingAverage: 4.95,
      ratingCount: 430,
      ratingDistribution: { 1: 0, 2: 1, 3: 4, 4: 25, 5: 400 },
      completedServicesCount: 680,
      acceptanceRate: 0.98,
      avgEtaMinutes: 6.1,
      vehicle: {
        brand: 'Nissan',
        model: 'Versa 2024',
        licensePlate: 'MNO456',
        color: 'Azul Oscuro',
        category: VehicleCategory.CONFORT,
        seats: 4,
      },
    },
    {
      name: 'Diego Fernando Ortiz',
      phone: '573158889900',
      nationalId: '1144001004',
      lat: 3.4735,
      lng: -76.5273,
      ratingAverage: 4.75,
      ratingCount: 310,
      ratingDistribution: { 1: 3, 2: 8, 3: 19, 4: 60, 5: 220 },
      completedServicesCount: 520,
      acceptanceRate: 0.91,
      avgEtaMinutes: 5.5,
      vehicle: {
        brand: 'Toyota',
        model: 'Corolla 2021',
        licensePlate: 'QWE321',
        color: 'Negro',
        category: VehicleCategory.CONFORT,
        seats: 4,
      },
    },
    {
      name: 'Mario Alberto Restrepo',
      phone: '573204443322',
      nationalId: '1144001005',
      lat: 3.4475,
      lng: -76.5398,
      ratingAverage: 4.82,
      ratingCount: 95,
      ratingDistribution: { 1: 1, 2: 2, 3: 4, 4: 18, 5: 70 },
      completedServicesCount: 160,
      acceptanceRate: 0.93,
      avgEtaMinutes: 5.0,
      vehicle: {
        brand: 'Kia',
        model: 'Rio 2020',
        licensePlate: 'JKL654',
        color: 'Rojo',
        category: VehicleCategory.BASICO,
        seats: 4,
      },
    },
  ];

  for (const item of driversData) {
    const driver = await prisma.driver.upsert({
      where: { phone: item.phone },
      update: {
        status: DriverStatus.AVAILABLE,
        currentLatitude: item.lat,
        currentLongitude: item.lng,
        lastLocationUpdate: new Date(),
        ratingAverage: item.ratingAverage,
        ratingCount: item.ratingCount,
        ratingDistribution: item.ratingDistribution,
        completedServicesCount: item.completedServicesCount,
      },
      create: {
        name: item.name,
        phone: item.phone,
        nationalId: item.nationalId,
        status: DriverStatus.AVAILABLE,
        currentLatitude: item.lat,
        currentLongitude: item.lng,
        lastLocationUpdate: new Date(),
        ratingAverage: item.ratingAverage,
        ratingCount: item.ratingCount,
        ratingDistribution: item.ratingDistribution,
        completedServicesCount: item.completedServicesCount,
        acceptanceRate: item.acceptanceRate,
        avgEtaMinutes: item.avgEtaMinutes,
        vehicle: {
          create: item.vehicle,
        },
      },
    });

    console.log(`🚕 Conductor listo: ${driver.name} (${item.vehicle.licensePlate})`);
  }

  // 3. Crear Zonas Operativas
  const zones = [
    { name: 'Granada / Centenario', polygon: [{ latitude: 3.455, longitude: -76.535 }] },
    { name: 'Centro Histórico', polygon: [{ latitude: 3.451, longitude: -76.532 }] },
    { name: 'Zona Sur / Unicentro', polygon: [{ latitude: 3.376, longitude: -76.540 }] },
    { name: 'Zona Norte / Chipichape', polygon: [{ latitude: 3.473, longitude: -76.527 }] },
  ];

  for (const z of zones) {
    await prisma.zone.upsert({
      where: { name: z.name },
      update: {},
      create: {
        name: z.name,
        polygonGeoJson: z.polygon,
        isActive: true,
      },
    });
  }

  console.log('✅ Base de datos inicializada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
