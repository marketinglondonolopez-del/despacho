import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/auth/auth.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await AuthService.login(body.email, body.password);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 401 });
  }
}
