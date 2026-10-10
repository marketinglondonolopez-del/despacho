import { NextRequest, NextResponse } from 'next/server';
import { DriverService } from '@/modules/drivers/driver.service';
import { DriverStatus } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const status = body.status as DriverStatus;
    const updated = await DriverService.updateStatus(params.id, status);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
