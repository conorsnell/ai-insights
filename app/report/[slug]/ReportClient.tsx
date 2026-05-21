'use client';

import { useState } from 'react';
import type { Report, BucketScore, AiBucketScore, InsightItem, AiPlatformScore } from '@/lib/types';
import { CTABand, InfoTooltip } from '@/components/brand-ui';
import { RADAR_AXIS_ORDER } from '@/lib/platform-config';

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

function platformTier(score: number, maxScore: number, available: boolean): string {
  if (!available) return 'Unavailable';
  const pct = score / maxScore;
  if (pct >= 0.66) return 'Strong';
  if (pct >= 0.33) return 'Partial';
  if (score > 0) return 'Low';
  return 'Not Found';
}

function platformTierColor(tier: string): string {
  if (tier === 'Strong') return C.green;
  if (tier === 'Partial') return C.blue;
  if (tier === 'Low') return C.orange;
  return '#dc2626';
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="dd-score-gauge relative inline-flex items-center justify-center">
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

// ─── Bucket Card ──────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
    >
      <path d="M4 6l4 4 4-4" stroke={C.charcoal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BucketCard({
  title,
  bucket,
  badge,
  badgeTooltip,
  summary,
}: {
  title: string;
  bucket: BucketScore;
  badge?: string;
  badgeTooltip?: string;
  summary?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round((bucket.earned / bucket.possible) * 100);
  const color = scoreColor(bucket.earned, bucket.possible);
  const labelColor = scoreLabelColor(pct);
  const clickable = !!summary;

  return (
    <div style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }} className="bucket-card rounded-xl overflow-hidden">
      <div
        className={`p-5 flex flex-col gap-3${clickable ? ' cursor-pointer select-none' : ''}`}
        onClick={clickable ? () => setExpanded(o => !o) : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm leading-snug" style={{ color: C.navy, fontWeight: 600 }}>{title}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap cursor-help"
                style={{ backgroundColor: C.orange, color: C.white, fontWeight: 500 }}
                title={badgeTooltip}
                onClick={e => e.stopPropagation()}
              >
                {badge}
              </span>
            )}
            {clickable && <ChevronIcon open={expanded} />}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl" style={{ color, fontWeight: 700 }}>{bucket.earned}</span>
          <span className="text-lg mb-0.5" style={{ color: C.charcoal }}>/ {bucket.possible}</span>
        </div>
        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: C.lightGrey }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: C.blue }}
          />
        </div>
        <span className="text-xs font-medium" style={{ color: labelColor, fontWeight: 500 }}>{scoreLabel(pct)}</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.28s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-5 pb-5 pt-0">
            <div style={{ borderTop: `1px solid ${C.lightGrey}`, paddingTop: 12 }}>
              <p className="text-xs leading-relaxed" style={{ color: C.charcoal }}>{summary}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Readiness Summary ────────────────────────────────────────────────────

function ExecutiveSummaryBox({ summary }: { summary: string | string[] }) {
  const bullets = Array.isArray(summary) ? summary : null;
  const paragraph = !Array.isArray(summary) ? summary : null;

  return (
    <section
      className="ai-readiness-summary rounded-xl px-6 py-5"
      style={{
        backgroundColor: C.white,
        borderLeft: `4px solid ${C.blue}`,
        boxShadow: '0 1px 6px 0 rgba(10,14,69,0.10)',
      }}
    >
      <h2 className="section-header text-base mb-4" style={{ color: C.navy, fontWeight: 600 }}>
        AI Readiness Summary
      </h2>
      {bullets ? (
        <ul className="flex flex-col gap-3">
          {bullets.map((bullet, i) => (
            <li key={i} className="insight-item flex items-start gap-3">
              <span
                className="mt-1.5 shrink-0 rounded-full"
                style={{ width: 7, height: 7, backgroundColor: C.blue, display: 'block' }}
              />
              <span className="text-sm leading-relaxed" style={{ color: C.black }}>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: C.charcoal }}>{paragraph}</p>
      )}
    </section>
  );
}

// ─── Platform Row ─────────────────────────────────────────────────────────────

function PlatformRow({ platform }: { platform: AiPlatformScore }) {
  const [expanded, setExpanded] = useState(false);
  const tier = platformTier(platform.score, platform.maxScore, platform.available);
  const tierColor = platformTierColor(tier);
  const pct = platform.available ? Math.round((platform.score / platform.maxScore) * 100) : 0;

  const isClaude = platform.platform === 'Claude';

  return (
    <div style={{ borderTop: `1px solid ${C.lightGrey}` }}>
      <button
        className="w-full text-left"
        onClick={() => setExpanded(o => !o)}
      >
        <div className="px-6 py-3 flex items-center gap-3">
          <span
            className="text-sm font-medium w-24 shrink-0"
            style={{ color: C.black }}
            title={isClaude ? 'Probed using Anthropic Claude API. Results may vary across model versions.' : undefined}
          >
            {platform.platform}
            {isClaude && (
              <span
                className="ml-1 cursor-help"
                style={{ color: C.charcoal, fontSize: 11 }}
                title="Probed using Anthropic Claude API. Results may vary across model versions."
              >
                ⓘ
              </span>
            )}
          </span>
          <div className="flex-1 rounded-full h-1.5 min-w-0" style={{ backgroundColor: C.lightGrey }}>
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${pct}%`, backgroundColor: platform.available ? C.blue : C.lightGrey }}
            />
          </div>
          <span className="text-xs font-semibold w-14 text-right shrink-0" style={{ color: scoreColor(platform.score, platform.maxScore) }}>
            {platform.score}/{platform.maxScore} pts
          </span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full w-24 text-center shrink-0"
            style={{ backgroundColor: tierColor + '18', color: tierColor, fontWeight: 500 }}
          >
            {tier}
          </span>
          <ChevronIcon open={expanded} />
        </div>
      </button>

      <div
        className="probe-detail-row"
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-6 pb-4 flex flex-col gap-2.5">
            {platform.probeResults.map((probe, i) => (
              <div key={i} className="flex items-start gap-3 pt-2" style={{ borderTop: `1px solid ${C.lightGrey}` }}>
                <div className="mt-0.5 shrink-0">
                  {probe.score === probe.maxScore && probe.maxScore > 0 ? (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill={C.green} />
                      <path d="M5.5 10.5l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : probe.score > 0 ? (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill={C.orange} />
                      <path d="M10 6v5M10 13.5v.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="#dc2626" />
                      <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs" style={{ color: C.black }}>&ldquo;{probe.prompt}&rdquo;</p>
                    <span className="text-xs font-semibold shrink-0" style={{ color: scoreColor(probe.score, probe.maxScore) }}>
                      {probe.score}/{probe.maxScore}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: probe.brandMentioned ? C.green : '#dc2626' }}>
                    {probe.brandMentioned ? '✓ Brand mentioned' : '✗ Brand not mentioned'}
                  </p>
                  {probe.snippet && (
                    <p className="text-xs italic mt-1 pl-2.5" style={{ color: C.charcoal, borderLeft: `2px solid ${C.lightPurple}` }}>
                      &ldquo;{probe.snippet}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Platform Score Card (2×2 grid) ─────────────────────────────────────────

function PlatformScoreCard({ platform }: { platform: AiPlatformScore }) {
  const tier = platformTier(platform.score, platform.maxScore, platform.available);
  const tierColor =
    tier === 'Strong'      ? C.green :
    tier === 'Partial'     ? C.orange :
    tier === 'Low'         ? C.orange : C.charcoal;
  const pct = platform.available ? Math.round((platform.score / platform.maxScore) * 100) : 0;

  return (
    <div
      className="platform-score-card"
      style={{
        backgroundColor: C.white,
        border: `1px solid ${C.lightGrey}`,
        borderRadius: 8,
        padding: '14px 16px',
        boxShadow: '0 1px 4px 0 rgba(10,14,69,0.06)',
      }}
    >
      <p style={{ color: C.black, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
        {platform.platform}
      </p>
      {platform.available ? (
        <p style={{ lineHeight: 1.2, marginBottom: 8 }}>
          <span style={{ color: C.blue, fontWeight: 700, fontSize: 22 }}>{platform.score}</span>
          <span style={{ color: C.charcoal, fontWeight: 400, fontSize: 13 }}> / {platform.maxScore} pts</span>
        </p>
      ) : (
        <p style={{ color: C.charcoal, fontSize: 13, marginBottom: 8 }}>Unavailable</p>
      )}
      <div style={{ height: 4, borderRadius: 2, backgroundColor: C.lightGrey, marginBottom: 8 }}>
        <div style={{ height: 4, borderRadius: 2, backgroundColor: platform.available ? C.blue : C.lightGrey, width: `${pct}%`, transition: 'width 0.4s ease' }} />
      </div>
      <span
        style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 500,
          color: tierColor,
          backgroundColor: tierColor + '1F',
          padding: '2px 9px',
          borderRadius: 99,
        }}
      >
        {tier}
      </span>
    </div>
  );
}

// ─── AI Visibility Section ────────────────────────────────────────────────────

function AIVisibilitySection({
  bucket,
  domain,
}: {
  bucket: AiBucketScore;
  domain: string;
}) {
  // Fallback: if no aiPlatformScores, render old Perplexity-only layout
  if (!bucket.aiPlatformScores?.length) {
    return (
      <section style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }} className="rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center gap-3" style={{ backgroundColor: C.lightGrey, borderColor: C.lightPurple }}>
          <span className="text-xl">🤖</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold" style={{ color: C.navy, fontWeight: 600 }}>AI Visibility</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: C.orange, color: C.white, fontWeight: 500 }}>Estimated</span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <span className="text-2xl font-bold" style={{ color: scoreColor(bucket.earned, bucket.possible), fontWeight: 700 }}>{bucket.earned}</span>
            <span style={{ color: C.charcoal }}> / {bucket.possible}</span>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: C.lightGrey }}>
          {bucket.probes.map((probe, i) => (
            <div key={i} className="px-6 py-4 flex items-start gap-4" style={{ borderColor: C.lightGrey }}>
              <div className="mt-0.5 shrink-0 text-lg leading-none">
                {probe.prominent ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill={C.green} />
                    <path d="M5.5 10.5l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : probe.mentioned ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill={C.orange} />
                    <path d="M10 6v5M10 13.5v.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#dc2626" />
                    <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: C.black }}>&ldquo;{probe.prompt}&rdquo;</p>
                  <span className="text-xs font-semibold shrink-0" style={{ color: scoreColor(probe.earned, probe.possible), fontWeight: 600 }}>
                    {probe.earned}/{probe.possible} pts
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: C.charcoal }}>
                  {probe.prominent ? 'Brand mentioned prominently in first half of response' : probe.mentioned ? 'Brand mentioned, but not prominently' : 'Brand not mentioned in response'}
                </p>
                {probe.excerpt && (
                  <p className="text-xs italic mt-1.5 pl-3" style={{ color: C.charcoal, borderLeft: `2px solid ${C.lightPurple}` }}>
                    &ldquo;{probe.excerpt}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const unavailableCount = bucket.aiPlatformScores.filter(p => !p.available).length;

  return (
    <section style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }} className="rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: C.lightGrey, borderBottom: `1px solid ${C.lightPurple}` }}>
        <span className="text-xl">🤖</span>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold" style={{ color: C.navy, fontWeight: 600 }}>AI Visibility</h2>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full cursor-help"
              style={{ backgroundColor: C.orange, color: C.white, fontWeight: 500 }}
              title="AI visibility is estimated based on live API probes across four platforms: ChatGPT, Gemini, Perplexity, and Claude. Results may vary between runs as AI responses are non-deterministic."
            >
              Estimated
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: C.charcoal }}>
            Based on 3 live probes × 4 AI platforms — hover badge for methodology
          </p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-2xl font-bold" style={{ color: scoreColor(bucket.earned, bucket.possible), fontWeight: 700 }}>
            {bucket.earned}
          </span>
          <span style={{ color: C.charcoal }}> / {bucket.possible}</span>
        </div>
      </div>

      {/* 2×2 platform scorecard grid */}
      <div className="px-6 pt-5 pb-4 grid grid-cols-2 gap-3">
        {RADAR_AXIS_ORDER.map(name => {
          const p = bucket.aiPlatformScores!.find(s => s.platform === name);
          if (!p) return null;
          return <PlatformScoreCard key={name} platform={p} />;
        })}
      </div>

      {/* Cross-platform insight */}
      {bucket.crossPlatformInsight && (
        <div className="px-6 pb-4">
          <p className="text-sm italic" style={{ color: C.charcoal }}>
            <span className="not-italic mr-1">⚡</span>
            {bucket.crossPlatformInsight}
          </p>
        </div>
      )}

      {/* Per-platform rows */}
      <div>
        {bucket.aiPlatformScores.map((platform) => (
          <PlatformRow key={platform.platform} platform={platform} />
        ))}
      </div>

      {/* Unavailable notice */}
      {unavailableCount > 0 && (
        <div className="px-6 py-2" style={{ borderTop: `1px solid ${C.lightGrey}` }}>
          <p className="text-xs" style={{ color: C.charcoal }}>
            ⚠️ {unavailableCount} platform{unavailableCount !== 1 ? 's were' : ' was'} unavailable during this analysis. Total score calculated from available platforms only.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-6 py-3" style={{ borderTop: `1px solid ${C.lightGrey}`, backgroundColor: C.lightGrey }}>
        <p style={{ fontSize: 11, color: C.charcoal }}>
          AI visibility is estimated based on live API probes across four platforms. Results may vary across sessions.
        </p>
      </div>
    </section>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────

const INSIGHT_SECTIONS = [
  { key: 'strengths'       as const, label: 'Top Strengths',             icon: '💪', accent: C.green,  headerClass: 'section-header-green'  },
  { key: 'gaps'            as const, label: 'Gaps & Opportunities',       icon: '🎯', accent: C.orange, headerClass: 'section-header-orange' },
  { key: 'recommendations' as const, label: 'Strategic Recommendations', icon: '🚀', accent: C.blue,   headerClass: 'section-header-blue'   },
] as const;

function InsightsSection({ report }: { report: Report }) {
  return (
    <div className="insights-section insights-columns grid md:grid-cols-3 gap-4">
      {INSIGHT_SECTIONS.map(({ key, label, icon, accent, headerClass }) => (
        <section
          key={key}
          className="insight-card rounded-xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: C.white,
            border: `1px solid ${C.lightGrey}`,
            boxShadow: '0 1px 4px 0 rgba(10,14,69,0.08)',
          }}
        >
          <div className={`${headerClass} section-header px-5 py-3.5 flex items-center gap-2`} style={{ backgroundColor: accent }}>
            <span className="text-base leading-none">{icon}</span>
            <h2 className="text-sm" style={{ color: C.white, fontWeight: 600 }}>{label}</h2>
          </div>
          <div className="flex flex-col flex-1" style={{ backgroundColor: C.white }}>
            {report.insights[key].map((item: InsightItem, i: number) => (
              <div
                key={i}
                className="insight-item px-5 py-4 flex gap-3"
                style={i > 0 ? { borderTop: `1px solid ${C.lightGrey}` } : {}}
              >
                <span
                  className="flex-none w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: accent, color: C.white, fontWeight: 700, fontSize: 11 }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm" style={{ color: C.black, fontWeight: 600 }}>{item.title}</p>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: C.charcoal }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Competitive Snapshot ─────────────────────────────────────────────────────

function buildCompetitiveCallout(report: Report): string {
  const competitors = report.competitorReports;
  if (!competitors?.length) return '';

  const primaryName = report.brandName || report.domain;
  const primaryTotal = report.totalScore;
  const topCompetitor = [...competitors].sort((a, b) => b.totalScore - a.totalScore)[0];
  const topScore = topCompetitor.totalScore;

  const bucketGaps = [
    { name: 'Technical Foundation', diff: report.buckets.technical.earned - topCompetitor.technical },
    { name: 'Search Authority',     diff: report.buckets.searchAuthority.earned - topCompetitor.searchAuthority },
    { name: 'Brand Presence',       diff: report.buckets.brandPresence.earned - topCompetitor.brandPresence },
    { name: 'AI Visibility',        diff: report.buckets.aiVisibility.earned - topCompetitor.aiVisibility },
  ];

  if (primaryTotal > topScore) {
    const gap = primaryTotal - topScore;
    const best = bucketGaps.reduce((a, b) => a.diff > b.diff ? a : b);
    return `${primaryName} leads all competitors by ${gap} point${gap !== 1 ? 's' : ''}${best.diff > 0 ? `, with the largest advantage in ${best.name}` : ''}.`;
  } else if (primaryTotal === topScore) {
    return `${primaryName} is tied for the top score among all analyzed domains.`;
  } else {
    const gap = topScore - primaryTotal;
    const worst = bucketGaps.reduce((a, b) => a.diff < b.diff ? a : b);
    return `${primaryName} trails ${topCompetitor.domain} by ${gap} point${gap !== 1 ? 's' : ''}${worst.diff < 0 ? `, with the largest gap in ${worst.name}` : ''}.`;
  }
}

function CompetitiveSnapshot({ report }: { report: Report }) {
  if (!report.competitorReports?.length) return null;

  const callout = buildCompetitiveCallout(report);

  const rows = [
    {
      domain: report.domain,
      totalScore: report.totalScore,
      technical: report.buckets.technical.earned,
      searchAuthority: report.buckets.searchAuthority.earned,
      brandPresence: report.buckets.brandPresence.earned,
      aiVisibility: report.buckets.aiVisibility.earned,
    },
    ...report.competitorReports,
  ].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <section className="competitive-snapshot-section rounded-xl overflow-hidden" style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }}>
      <div className="section-header px-6 py-4 border-b" style={{ borderColor: C.lightGrey }}>
        <h2 className="font-semibold" style={{ color: C.navy, fontWeight: 600 }}>⚡ Competitive Snapshot</h2>
      </div>
      {callout && (
        <div style={{ borderBottom: `1px solid ${C.lightPurple}`, padding: '8px 12px' }}>
          <p className="text-sm" style={{ color: C.black, fontWeight: 600, fontFamily: 'var(--font-outfit), sans-serif' }}>{callout}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="competitive-table-header" style={{ backgroundColor: C.navy }}>
              <th className="text-left px-6 py-3 text-xs uppercase tracking-wide font-medium" style={{ color: C.white }}>Domain</th>
              <th className="text-center px-4 py-3 text-xs uppercase tracking-wide font-medium" style={{ color: C.white }}>Total</th>
              <th className="text-center px-4 py-3 text-xs uppercase tracking-wide font-medium" style={{ color: C.white }}>Technical</th>
              <th className="text-center px-4 py-3 text-xs uppercase tracking-wide font-medium" style={{ color: C.white }}>Authority</th>
              <th className="text-center px-4 py-3 text-xs uppercase tracking-wide font-medium" style={{ color: C.white }}>Brand</th>
              <th className="text-center px-4 py-3 text-xs uppercase tracking-wide font-medium" style={{ color: C.white }}>AI Vis.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isSubject = row.domain === report.domain;
              return (
                <tr
                  key={i}
                  className="competitive-snapshot-row"
                  style={{ backgroundColor: C.white, borderTop: i > 0 ? `1px solid ${C.lightGrey}` : 'none' }}
                >
                  <td className="px-6 py-3 font-medium" style={{ color: C.black }}>
                    {row.domain}
                    {isSubject && (
                      <span
                        className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: C.blue, color: C.white, fontWeight: 600 }}
                      >
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span style={{ color: scoreColor(row.totalScore), fontWeight: 700 }} className="text-base">
                      {row.totalScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: C.charcoal }}>{row.technical}/25</td>
                  <td className="px-4 py-3 text-center" style={{ color: C.charcoal }}>{row.searchAuthority}/35</td>
                  <td className="px-4 py-3 text-center" style={{ color: C.charcoal }}>{row.brandPresence}/20</td>
                  <td className="px-4 py-3 text-center" style={{ color: C.charcoal }}>{row.aiVisibility}/20</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Raw Signal Data ──────────────────────────────────────────────────────────

function RawSignals({ report }: { report: Report }) {
  const [open, setOpen] = useState(false);

  const buckets = [
    { label: 'Technical Foundation',  bucket: report.buckets.technical },
    { label: 'Search Authority',      bucket: report.buckets.searchAuthority },
    { label: 'Brand Presence',        bucket: report.buckets.brandPresence },
    { label: 'AI Visibility',         bucket: report.buckets.aiVisibility },
  ];

  return (
    <section className="raw-signal-section rounded-xl overflow-hidden" style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }}>
      <button
        className="w-full flex items-center justify-between px-5 py-3 transition-colors"
        style={{ color: C.charcoal, fontWeight: 400, fontSize: 12 }}
        onClick={() => setOpen(o => !o)}
      >
        <span>📊 Raw Signal Data</span>
        <span style={{ color: C.charcoal }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.lightGrey}` }}>
          {buckets.map(({ label, bucket }) => (
            <div key={label}>
              <p
                className="px-5 py-1.5 uppercase tracking-wide"
                style={{ backgroundColor: C.navy, color: C.white, fontWeight: 400, fontSize: 11 }}
              >
                {label}
              </p>
              <table className="w-full" style={{ fontSize: 12, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr className="uppercase tracking-wide" style={{ backgroundColor: C.lightGrey }}>
                    <th className="text-left px-5 py-1.5 font-medium" style={{ color: C.charcoal, fontSize: 11 }}>Signal</th>
                    <th className="text-center px-3 py-1.5 font-medium" style={{ color: C.charcoal, fontSize: 11 }}>Score</th>
                    <th className="text-left px-3 py-1.5 font-medium" style={{ color: C.charcoal, fontSize: 11 }}>Source</th>
                    <th className="text-left px-3 py-1.5 font-medium" style={{ color: C.charcoal, fontSize: 11 }}>Raw Value</th>
                  </tr>
                </thead>
                <tbody>
                  {bucket.signals.map((sig, i) => (
                    <tr key={i} className="signal-row" style={{ backgroundColor: i % 2 === 0 ? C.white : C.lightGrey }}>
                      <td className="px-5 py-1.5" style={{ color: C.black }}>{sig.name}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span style={{ color: scoreColor(sig.earned, sig.possible), fontWeight: 600 }}>
                          {sig.earned}/{sig.possible}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-mono" style={{ color: C.charcoal }}>{sig.source}</td>
                      <td className="px-3 py-1.5 font-mono" style={{ color: C.charcoal }}>
                        {sig.rawValue !== undefined && sig.rawValue !== null ? String(sig.rawValue) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {report.keywordSource && (
            <p className="px-5 py-2 text-xs" style={{ color: C.charcoal, borderTop: `1px solid ${C.lightGrey}` }}>
              AI probe keyword source:{' '}
              <span style={{ fontWeight: 600, color: C.black }}>
                {report.keywordSource === 'manual'
                  ? 'Manual (user-provided key topics)'
                  : report.keywordSource === 'semrush'
                  ? 'SEMRush organic keyword data'
                  : 'Fallback (brand + industry prompts)'}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────

function ActionBar({ slug, shareToken }: { slug: string; shareToken?: string }) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    const shareUrl = shareToken
      ? `${window.location.origin}/s/${shareToken}`
      : `${window.location.origin}/report/${slug}/share`;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: C.blue, color: C.white, fontWeight: 500 }}
      >
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors hover:opacity-90"
        style={{ backgroundColor: C.white, color: C.navy, border: `1.5px solid ${C.navy}`, fontWeight: 500 }}
      >
        🖨️ Print / PDF
      </button>
      <button
        onClick={copyShareLink}
        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: C.green, color: C.black, fontWeight: 500 }}
      >
        {shareCopied ? '✓ Copied!' : '👤 Share with Client'}
      </button>
    </div>
  );
}

// ─── Main Report View ─────────────────────────────────────────────────────────

export function ReportView({ report }: { report: Report }) {
  const totalPct = report.totalScore;

  const metaItems = [
    report.brandName ? `Brand: ${report.brandName}` : null,
    report.industry  ? `Industry: ${report.industry}` : null,
    `Generated ${formatDate(report.createdAt)}`,
  ].filter(Boolean) as string[];


  return (
    <div className="min-h-screen" style={{ backgroundColor: C.lightGrey }}>

      {/* Nav */}
      <header style={{ backgroundColor: C.navy }} className="print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/"><img src="https://emjqwdk52dd.exactdn.com/wp-content/uploads/2025/12/Logo-Dark-Mode.svg" alt="demandDrive" style={{ height: 32 }} /></a>
          <ActionBar slug={report.slug} shareToken={report.shareToken} />
        </div>
      </header>
      {/* Print-only header */}
      <header className="hidden print:block border-b border-gray-200 px-6 py-4" style={{ backgroundColor: C.navy }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://emjqwdk52dd.exactdn.com/wp-content/uploads/2025/12/Logo-Dark-Mode.svg" alt="demandDrive" style={{ height: 32 }} />
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
              <p className="text-sm mt-1" style={{ color: C.charcoal, fontWeight: 400 }}>
                {scoreLabel(totalPct)} · {report.totalScore}/100
              </p>
            </div>
          </div>
          <ScoreGauge score={report.totalScore} size={160} />
        </section>

        {/* Bucket cards */}
        <div className="bucket-cards-grid grid grid-cols-2 md:grid-cols-4 gap-4">
          <BucketCard
            title="Technical Foundation"
            bucket={report.buckets.technical}
            summary={report.bucketSummaries?.technical}
          />
          <BucketCard
            title="Search Authority"
            bucket={report.buckets.searchAuthority}
            summary={report.bucketSummaries?.authority}
          />
          <BucketCard
            title="Brand Presence"
            bucket={report.buckets.brandPresence}
            summary={report.bucketSummaries?.brand}
          />
          <BucketCard
            title="AI Visibility"
            bucket={report.buckets.aiVisibility}
            badge="Estimated"
            badgeTooltip="AI visibility scores are estimated using live API probes across four platforms: ChatGPT, Gemini, Perplexity, and Claude."
            summary={report.bucketSummaries?.aiVisibility}
          />
        </div>

        {/* AI Readiness Summary */}
        {report.executiveSummary && <ExecutiveSummaryBox summary={report.executiveSummary} />}

        {/* AI Visibility multi-platform section */}
        <AIVisibilitySection
          bucket={report.buckets.aiVisibility}
          domain={report.domain}
        />

        {/* Insights */}
        <InsightsSection report={report} />

        {/* Competitive snapshot */}
        <CompetitiveSnapshot report={report} />

        {/* Raw signals */}
        <RawSignals report={report} />

      </main>

      {/* CTA Band — full width, outside the constrained main */}
      <CTABand />

      <footer className="no-print" style={{ backgroundColor: C.navy2 }}>
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-xs" style={{ color: C.white }}>
          © {new Date().getFullYear()} demandDrive · AI Insights · For internal use
        </div>
      </footer>
    </div>
  );
}
