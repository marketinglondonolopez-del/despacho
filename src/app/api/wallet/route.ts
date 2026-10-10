import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Memoria fallback para saldos de conductores
// Estrategia: Map driverPhone -> { driverPhone, driverName, debt: number, completedServices: number }
const memoryWallet = new Map<string, any>();

export async function GET() {
  try {
    const drivers = await prisma.driver.findMany({
      include: { vehicle: true }
    });

    const walletData = drivers.map(d => ({
      driverId: d.id,
      name: d.name,
      phone: d.phone,
      completedServices: d.completedServicesCount || 0,
      debt: (d.completedServicesCount || 0) * 500,
      vehicle: d.vehicle ? `${d.vehicle.brand} (${d.vehicle.licensePlate})` : 'Sin vehículo'
    }));

    return NextResponse.json({ success: true, data: walletData });
  } catch (error) {
    logger.error('PostgreSQL no disponible, usando saldos en memoria', { error: String(error) });
    const memoryData = Array.from(memoryWallet.values());
    return NextResponse.json({ success: true, data: memoryData, isMemoryFallback: true });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driverPhone, action, amount } = body;

    // Acción 1: Sumar $500 por carrera ganada
    if (action === 'ADD_SERVICE') {
      const fee = amount || 500;
      
      try {
        const driver = await prisma.driver.findFirst({
          where: { phone: { contains: driverPhone } }
        });

        if (driver) {
          await prisma.driver.update({
            where: { id: driver.id },
            data: { completedServicesCount: { increment: 1 } }
          });
        }
      } catch (e) {}

      // Actualizar memoria fallback
      const current = memoryWallet.get(driverPhone) || {
        driverPhone,
        name: 'Conductor',
        completedServices: 0,
        debt: 0
      };
      current.completedServices += 1;
      current.debt += fee;
      memoryWallet.set(driverPhone, current);

      return NextResponse.json({ success: true, message: `Sumados $${fee} a la deuda de ${driverPhone}` });
    }

    // Acción 2: Registrar Pago (Descontar o liquidar deuda)
    if (action === 'RECORD_PAYMENT') {
      const current = memoryWallet.get(driverPhone);
      if (current) {
        current.debt = Math.max(0, current.debt - (amount || current.debt));
        memoryWallet.set(driverPhone, current);
      }
      return NextResponse.json({ success: true, message: 'Pago registrado correctamente' });
    }

    return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error de servidor' }, { status: 500 });
  }
}
