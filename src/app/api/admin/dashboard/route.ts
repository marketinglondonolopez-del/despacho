import { NextResponse } from 'next/server';
import { AdminDashboardService } from '@/modules/admin/dashboard.service';

export async function GET() {
  try {
    const metrics = await AdminDashboardService.getLiveMetrics();
    const fleet = await AdminDashboardService.getLiveFleetForMap();
    const activeServices = await AdminDashboardService.getActiveServices();

    return NextResponse.json({
      metrics,
      fleet,
      activeServices,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
