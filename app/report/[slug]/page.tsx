import { notFound } from 'next/navigation';
import { redis } from '@/lib/redis';
import type { Report } from '@/lib/types';
import { ReportView } from './ReportClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ReportPage({ params }: Props) {
  const { slug } = await params;

  let report = await redis.get<Report>(`report:${slug}`);
  if (!report) notFound();

  // Migration: generate shareToken for reports created before this feature
  if (!report.shareToken) {
    const shareToken = Math.random().toString(36).slice(2, 14);
    report = { ...report, shareToken };
    await Promise.all([
      redis.set(`report:${slug}`, report),
      redis.set(`share:${shareToken}`, slug),
    ]);
  }

  return <ReportView report={report} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const report = await redis.get<Report>(`report:${slug}`);
  return {
    title: report ? `${report.domain} — AI Insights` : 'Report Not Found',
  };
}
