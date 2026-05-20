import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import type { Report } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const report = await redis.get<Report>(`report:${slug}`);

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  return NextResponse.json(report);
}
