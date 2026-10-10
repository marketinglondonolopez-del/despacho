import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// In-memory fallback
let memoryPassengers: any[] = [];

export async function GET() {
  try {
    const passengers = await prisma.passenger.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: passengers });
  } catch (error) {
    logger.error('PostgreSQL no disponible, devolviendo pasajeros en memoria', { error: String(error) });
    return NextResponse.json({ success: true, data: memoryPassengers, isMemoryFallback: true });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, message: 'Faltan campos' }, { status: 400 });
    }

    try {
      const newPassenger = await prisma.passenger.create({
        data: { name, phone }
      });
      return NextResponse.json({ success: true, data: newPassenger }, { status: 201 });
    } catch (dbError) {
      const memPassenger = {
        id: `pax-${Date.now()}`,
        name,
        phone,
        createdAt: new Date().toISOString()
      };
      memoryPassengers.push(memPassenger);
      return NextResponse.json({ success: true, data: memPassenger, isMemoryFallback: true }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error de servidor' }, { status: 500 });
  }
}
