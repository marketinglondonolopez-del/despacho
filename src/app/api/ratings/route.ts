import { NextRequest, NextResponse } from 'next/server';
import { RatingService } from '@/modules/ratings/rating.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId') || undefined;
    const minStars = searchParams.get('minStars') ? parseInt(searchParams.get('minStars')!, 10) : undefined;
    const maxStars = searchParams.get('maxStars') ? parseInt(searchParams.get('maxStars')!, 10) : undefined;

    const data = await RatingService.getAdminReputationOverview({ driverId, minStars, maxStars });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rating = await RatingService.submitRating({
      serviceId: body.serviceId,
      passengerId: body.passengerId,
      stars: body.stars,
      feedbackTag: body.feedbackTag,
      comment: body.comment,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'WebApp',
    });
    return NextResponse.json(rating, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
