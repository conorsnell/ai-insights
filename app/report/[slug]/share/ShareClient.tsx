'use client';

import type { Report, BucketScore } from '@/lib/types';
import { InfoTooltip } from '@/components/brand-ui';

// ─── Brand palette ────────────────────────────────────────────────────────────
const C = {
  navy:        '#0A0E45',
  blue:        '#0062DF',
  orange:      '#FF6300',
  green:       '#00DD84',
  white:       '#ffffff',
  navy2:       '#0E0E3B',
  lightGrey:   '#F5F6FE',
  charcoal:    '#59596D',
  lightPurple: '#CECFEE',
  black:       '#00002E',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number, max = 100): string {
  const pct = (score / max) * 100;
  if (pct >= 75) return C.green;
  if (pct >= 55) return C.blue;
  if (pct >= 35) return C.orange;
  return '#dc2626';
}

function scoreLabel(pct: number): string {
  if (pct >= 75) return 'Strong';
  if (pct >= 55) return 'Moderate';
  if (pct >= 35) return 'Developing';
  return 'Weak';
}

function scoreLabelColor(pct: number): string {
  if (pct >= 75) return C.green;
  if (pct >= 55) return C.blue;
  if (pct >= 35) return C.orange;
  return '#dc2626';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.lightGrey} strokeWidth={size * 0.072} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={C.blue}
          strokeWidth={size * 0.072}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span style={{ fontSize: size * 0.23, color: C.black, fontWeight: 700 }}>{score}</span>
        <span style={{ fontSize: size * 0.09, color: C.charcoal }}>/ 100</span>
      </div>
    </div>
  );
}

// ─── Simplified Bucket Card (no expansion) ────────────────────────────────────

function BucketCardSimple({
  title,
  bucket,
  badge,
  badgeTooltip,
}: {
  title: string;
  bucket: BucketScore;
  badge?: string;
  badgeTooltip?: string;
}) {
  const pct = Math.round((bucket.earned / bucket.possible) * 100);
  const color = scoreColor(bucket.earned, bucket.possible);
  const labelColor = scoreLabelColor(pct);

  return (
    <div style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }} className="rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm leading-snug" style={{ color: C.navy, fontWeight: 600 }}>{title}</span>
        {badge && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap cursor-help shrink-0"
            style={{ backgroundColor: C.orange, color: C.white, fontWeight: 500 }}
            title={badgeTooltip}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl" style={{ color, fontWeight: 700 }}>{bucket.earned}</span>
        <span className="text-lg mb-0.5" style={{ color: C.charcoal }}>/ {bucket.possible}</span>
      </div>
      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: C.lightGrey }}>
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: C.blue }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color: labelColor, fontWeight: 500 }}>{scoreLabel(pct)}</span>
    </div>
  );
}

// ─── Teaser Insights ──────────────────────────────────────────────────────────

function BlurredItem({ title }: { title: string }) {
  return (
    <div className="relative px-5 py-4 flex gap-3" style={{ borderTop: `1px solid ${C.lightGrey}` }}>
      <div
        className="flex-none w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: C.lightGrey, fontSize: 11 }}
      />
      <div className="flex-1" style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>
        <p className="text-sm" style={{ color: C.black, fontWeight: 600 }}>{title}</p>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: 18 }}>🔒</span>
      </div>
    </div>
  );
}

function TeaserInsights({ report }: { report: Report }) {
  const strength0 = report.insights.strengths[0];
  const gap0 = report.insights.gaps[0];
  const hiddenStrengths = report.insights.strengths.slice(1);
  const hiddenGaps = report.insights.gaps.slice(1);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Strengths teaser */}
      <section
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }}
      >
        <div className="px-5 py-3.5 flex items-center gap-2" style={{ backgroundColor: C.green }}>
          <span className="text-base leading-none">💪</span>
          <h2 className="text-sm" style={{ color: C.white, fontWeight: 600 }}>Top Strengths</h2>
        </div>
        {strength0 && (
          <div className="px-5 py-4 flex gap-3">
            <span
              className="flex-none w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: C.green, color: C.white, fontWeight: 700, fontSize: 11 }}
            >
              1
            </span>
            <div>
              <p className="text-sm" style={{ color: C.black, fontWeight: 600 }}>{strength0.title}</p>
            </div>
          </div>
        )}
        {hiddenStrengths.map((item, i) => (
          <BlurredItem key={i} title={item.title} />
        ))}
      </section>

      {/* Gaps teaser */}
      <section
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }}
      >
        <div className="px-5 py-3.5 flex items-center gap-2" style={{ backgroundColor: C.orange }}>
          <span className="text-base leading-none">🎯</span>
          <h2 className="text-sm" style={{ color: C.white, fontWeight: 600 }}>Gaps & Opportunities</h2>
        </div>
        {gap0 && (
          <div className="px-5 py-4 flex gap-3">
            <span
              className="flex-none w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: C.orange, color: C.white, fontWeight: 700, fontSize: 11 }}
            >
              1
            </span>
            <div>
              <p className="text-sm" style={{ color: C.black, fontWeight: 600 }}>{gap0.title}</p>
            </div>
          </div>
        )}
        {hiddenGaps.map((item, i) => (
          <BlurredItem key={i} title={item.title} />
        ))}
      </section>
    </div>
  );
}

// ─── Share View ───────────────────────────────────────────────────────────────

export function ShareView({ report }: { report: Report }) {
  const totalPct = report.totalScore;

  const metaItems = [
    report.brandName ? `Brand: ${report.brandName}` : null,
    report.industry  ? `Industry: ${report.industry}` : null,
    `Generated ${formatDate(report.createdAt)}`,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.lightGrey }}>

      {/* Nav */}
      <header style={{ backgroundColor: C.navy }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/"><img src="https://emjqwdk52dd.exactdn.com/wp-content/uploads/2025/12/Logo-Dark-Mode.svg" alt="demandDrive" style={{ height: 32 }} /></a>
          <a
            href="https://www.demanddrive.com/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: C.blue, color: C.white, fontWeight: 500 }}
          >
            Contact Us
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Hero */}
        <section className="rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6" style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }}>
          <div>
            <h1 className="text-2xl" style={{ color: C.black, fontWeight: 700 }}>{report.domain}</h1>
            <p className="mt-1" style={{ fontSize: 13, color: C.charcoal, fontWeight: 400 }}>
              {metaItems.join(' · ')}
            </p>
            <div className="mt-4">
              <div className="flex items-center gap-1.5">
                <p className="text-xs uppercase tracking-wide" style={{ color: C.black, fontWeight: 600 }}>
                  Overall AI Readiness Score
                </p>
                <InfoTooltip text="Composite score across four signal buckets: Technical Foundation, Search Authority, Brand Presence, and AI Visibility (estimated)." />
              </div>
              <p className="text-sm mt-1" style={{ color: scoreLabelColor(totalPct), fontWeight: 400 }}>
                {scoreLabel(totalPct)} · {report.totalScore}/100
              </p>
            </div>
          </div>
          <ScoreGauge score={report.totalScore} size={160} />
        </section>

        {/* Simplified bucket cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BucketCardSimple title="Technical Foundation" bucket={report.buckets.technical} />
          <BucketCardSimple title="Search Authority"     bucket={report.buckets.searchAuthority} />
          <BucketCardSimple title="Brand Presence"       bucket={report.buckets.brandPresence} />
          <BucketCardSimple
            title="AI Visibility"
            bucket={report.buckets.aiVisibility}
            badge="Estimated"
            badgeTooltip="AI visibility scores are estimated using live Perplexity API probes."
          />
        </div>

        {/* Teaser insights — first item visible, rest blurred */}
        <TeaserInsights report={report} />

      </main>

      {/* Unified CTA */}
      <section className="py-16 px-6 text-center" style={{ backgroundColor: C.navy }}>
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
          <h2 className="text-2xl" style={{ color: C.white, fontWeight: 700 }}>
            Get your full AI Visibility Report
          </h2>
          <p className="text-base leading-relaxed" style={{ color: C.lightPurple, fontWeight: 400 }}>
            See the complete breakdown including strategic recommendations, competitive analysis, and signal-level data. A demandDrive strategist will follow up with your full report and analysis.
          </p>
          <a
            href="https://www.demanddrive.com/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-90"
            style={{ backgroundColor: C.blue, color: C.white, fontWeight: 500, padding: '12px 32px', borderRadius: 6, fontSize: 14, display: 'inline-block' }}
          >
            Contact Us
          </a>
        </div>
      </section>

      <footer style={{ backgroundColor: C.navy2 }}>
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-xs" style={{ color: C.white }}>
          © {new Date().getFullYear()} demandDrive · AI Insights
        </div>
      </footer>
    </div>
  );
}
