import { notFound, redirect } from 'next/navigation';
import { redis } from '@/lib/redis';
import type { Report } from '@/lib/types';
import { ShareView } from './ShareClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SharePage({ params }: Props) {
  const { slug } = await params;
  let report = await redis.get<Report>(`report:${slug}`);
  if (!report) notFound();

  // Migration: generate shareToken if missing
  if (!report.shareToken) {
    const shareToken = Math.random().toString(36).slice(2, 14);
    report = { ...report, shareToken };
    await Promise.all([
      redis.set(`report:${slug}`, report),
      redis.set(`share:${shareToken}`, slug),
    ]);
  }

  redirect(`/s/${report.shareToken}`);
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const report = await redis.get<Report>(`report:${slug}`);
  return {
    title: report ? `${report.domain} — AI Visibility Report` : 'Report Not Found',
  };
}
