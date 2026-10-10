import { NextRequest, NextResponse } from 'next/server';
import { ServiceService } from '@/modules/services/service.service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const service = await ServiceService.driverArrived(params.id, body.driverId);
    return NextResponse.json(service);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
