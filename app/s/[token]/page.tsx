import { notFound } from 'next/navigation';
import { redis } from '@/lib/redis';
import type { Report } from '@/lib/types';
import { ShareView } from '@/components/share-view';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ShareTokenPage({ params }: Props) {
  const { token } = await params;
  const slug = await redis.get<string>(`share:${token}`);
  if (!slug) notFound();

  const report = await redis.get<Report>(`report:${slug}`);
  if (!report) notFound();

  return <ShareView report={report} />;
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const slug = await redis.get<string>(`share:${token}`);
  if (!slug) return { title: 'Report Not Found' };

  const report = await redis.get<Report>(`report:${slug}`);
  return {
    title: report ? `${report.domain} — AI Visibility Report` : 'Report Not Found',
  };
}
