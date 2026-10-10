import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ServiceService, memoryServices } from '@/modules/services/service.service';
import { ServiceStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ServiceStatus | null;
    const driverId = searchParams.get('driverId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (driverId) where.driverId = driverId;

    const services = await prisma.service.findMany({
      where,
      include: {
        passenger: true,
        driver: {
          include: { vehicle: true },
        },
        rating: true,
        cancellation: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(services);
  } catch {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId');
    if (driverId) {
      return NextResponse.json(memoryServices.filter((s: any) => s.driverId === driverId));
    }
    return NextResponse.json(memoryServices);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const service = await ServiceService.createService({
      passengerPhone: body.passengerPhone,
      passengerName: body.passengerName,
      originAddress: body.originAddress,
      originCoords: body.originCoords,
      destinationAddress: body.destinationAddress,
      destinationCoords: body.destinationCoords,
      passengersCount: body.passengersCount,
      notes: body.notes,
    });

    return NextResponse.json(service, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
