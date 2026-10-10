import { NextRequest, NextResponse } from 'next/server';
import { DriverLocationService } from '@/modules/drivers/location.service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await DriverLocationService.updateLocation({
      driverId: params.id,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters,
      speedKmh: body.speedKmh,
      headingDeg: body.headingDeg,
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
