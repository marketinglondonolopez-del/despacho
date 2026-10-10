import { NextRequest, NextResponse } from 'next/server';
import { DriverService } from '@/modules/drivers/driver.service';

export async function GET() {
  try {
    const drivers = await DriverService.listDriversForAdmin();
    return NextResponse.json(drivers);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const driver = await DriverService.createDriver(body);
    return NextResponse.json(driver, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
