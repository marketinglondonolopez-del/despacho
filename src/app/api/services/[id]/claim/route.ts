import { NextRequest, NextResponse } from 'next/server';
import { AtomicClaimService } from '@/modules/dispatch/atomic-claim';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const serviceId = params.id;
    const driverId = body.driverId;

    if (!driverId) {
      return NextResponse.json({ error: 'driverId es requerido' }, { status: 400 });
    }

    const result = await AtomicClaimService.claimService(serviceId, driverId);

    if (!result.success) {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
