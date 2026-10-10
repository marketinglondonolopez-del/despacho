import { NextRequest, NextResponse } from 'next/server';
import { ServiceService } from '@/modules/services/service.service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const service = await ServiceService.cancelService({
      serviceId: params.id,
      cancelledBy: body.cancelledBy || 'CUSTOMER',
      reason: body.reason || 'Cancelación solicitada',
      driverId: body.driverId,
      passengerId: body.passengerId,
      notes: body.notes,
    });
    return NextResponse.json(service);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
