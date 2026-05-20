'use client';

import { useEffect } from 'react';
import type { Report, InsightItem } from '@/lib/types';

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

function scoreColor(earned: number, possible: number): string {
  const pct = (earned / possible) * 100;
  if (pct >= 75) return C.green;
  if (pct >= 55) return C.blue;
  if (pct >= 35) return C.orange;
  return '#dc2626';
}

function scoreLabel(earned: number, possible: number): string {
  const pct = (earned / possible) * 100;
  if (pct >= 75) return 'Strong';
  if (pct >= 55) return 'Moderate';
  if (pct >= 35) return 'Developing';
  return 'Weak';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function MiniGauge({ score, size = 72 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={size * 0.08} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={C.green}
          strokeWidth={size * 0.08}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: size * 0.28, color: C.white, fontWeight: 700 }}>{score}</span>
        <span style={{ fontSize: size * 0.13, color: 'rgba(255,255,255,0.65)' }}>/100</span>
      </div>
    </div>
  );
}

const ACCENT: Record<string, string> = {
  strengths:       C.green,
  gaps:            C.orange,
  recommendations: C.blue,
};
const SECTION_META: Record<string, { label: string; icon: string }> = {
  strengths:       { label: 'Top Strengths',             icon: '💪' },
  gaps:            { label: 'Gaps & Opportunities',       icon: '🎯' },
  recommendations: { label: 'Strategic Recommendations', icon: '🚀' },
};

function InsightColumn({ type, items }: { type: string; items: InsightItem[] }) {
  const color = ACCENT[type];
  const { label, icon } = SECTION_META[type];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${C.lightGrey}`, borderRadius: 6, overflow: 'hidden', backgroundColor: C.white }}>
      <div style={{ backgroundColor: color, padding: '5px 9px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 11 }}>{icon}</span>
        <span style={{ color: C.white, fontWeight: 600, fontSize: 9 }}>{label}</span>
      </div>
      {items.slice(0, 3).map((item, i) => (
        <div
          key={i}
          style={{
            padding: '5px 9px',
            display: 'flex',
            gap: 6,
            borderTop: i > 0 ? `1px solid ${C.lightGrey}` : 'none',
            flex: 1,
          }}
        >
          <span style={{
            flexShrink: 0, width: 15, height: 15, borderRadius: '50%',
            backgroundColor: color, color: C.white,
            fontWeight: 700, fontSize: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 1,
          }}>
            {i + 1}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ color: C.black, fontWeight: 600, fontSize: 8.5, margin: 0, lineHeight: 1.35 }}>{item.title}</p>
            <p style={{
              color: C.charcoal, fontSize: 7.5, margin: '2px 0 0', lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {item.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PdfView({ report }: { report: Report }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 1200);
    return () => clearTimeout(t);
  }, []);

  const buckets = [
    { label: 'Technical Foundation', earned: report.buckets.technical.earned,       possible: report.buckets.technical.possible       },
    { label: 'Search Authority',     earned: report.buckets.searchAuthority.earned,  possible: report.buckets.searchAuthority.possible  },
    { label: 'Brand Presence',       earned: report.buckets.brandPresence.earned,    possible: report.buckets.brandPresence.possible    },
    { label: 'AI Visibility',        earned: report.buckets.aiVisibility.earned,     possible: report.buckets.aiVisibility.possible     },
  ];

  const competitorRows = report.competitorReports?.length
    ? [
        {
          domain: report.domain,
          totalScore: report.totalScore,
          technical: report.buckets.technical.earned,
          searchAuthority: report.buckets.searchAuthority.earned,
          brandPresence: report.buckets.brandPresence.earned,
          aiVisibility: report.buckets.aiVisibility.earned,
          isSubject: true,
        },
        ...report.competitorReports.map(c => ({ ...c, isSubject: false })),
      ].sort((a, b) => b.totalScore - a.totalScore)
    : [];

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-scheme: light !important; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: white; font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif; }
        @media print { .pdf-banner { display: none !important; } }
      `}</style>

      {/* On-screen helper banner — hidden in print */}
      <div className="pdf-banner" style={{
        backgroundColor: C.navy, color: C.white,
        padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 13,
      }}>
        <span>📄 Print dialog will open automatically — choose <strong>Landscape</strong> &amp; <strong>Save as PDF</strong></span>
        <button
          onClick={() => window.print()}
          style={{ padding: '4px 14px', backgroundColor: C.white, color: C.navy, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
        >
          Print Now
        </button>
      </div>

      {/* ── PDF Page ── */}
      <div style={{ width: '277mm', fontFamily: "'Outfit','Helvetica Neue',Arial,sans-serif", backgroundColor: C.white, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ backgroundColor: C.navy, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://emjqwdk52dd.exactdn.com/wp-content/uploads/2025/12/Logo-Dark-Mode.svg" alt="demandDrive" style={{ height: 20, display: 'block' }} />
            <span style={{ color: C.lightPurple, fontSize: 7.5, fontWeight: 400 }}>AI Visibility Report</span>
          </div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>{report.domain}</div>
            {report.brandName && report.brandName !== report.domain && (
              <div style={{ color: C.lightPurple, fontSize: 10, marginTop: 2 }}>{report.brandName}</div>
            )}
            {report.industry && (
              <div style={{ color: C.lightPurple, fontSize: 9, marginTop: 1 }}>{report.industry}</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <MiniGauge score={report.totalScore} size={66} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 7.5 }}>Overall AI Readiness</span>
          </div>
        </div>

        {/* Bucket scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '8px 16px', backgroundColor: C.lightGrey }}>
          {buckets.map((b, i) => {
            const color = scoreColor(b.earned, b.possible);
            const pct = Math.round((b.earned / b.possible) * 100);
            return (
              <div key={i} style={{ border: `1px solid ${C.lightPurple}`, borderRadius: 6, padding: '7px 10px', backgroundColor: C.white }}>
                <div style={{ color: C.navy, fontWeight: 600, fontSize: 8.5, marginBottom: 4 }}>{b.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ color, fontWeight: 700, fontSize: 20 }}>{b.earned}</span>
                  <span style={{ color: C.charcoal, fontSize: 10 }}>/ {b.possible}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, backgroundColor: C.lightGrey, margin: '4px 0 3px' }}>
                  <div style={{ height: 3, borderRadius: 2, backgroundColor: color, width: `${pct}%` }} />
                </div>
                <div style={{ color, fontWeight: 500, fontSize: 7.5 }}>{scoreLabel(b.earned, b.possible)}</div>
              </div>
            );
          })}
        </div>

        {/* Insights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '6px 16px' }}>
          <InsightColumn type="strengths"       items={report.insights.strengths} />
          <InsightColumn type="gaps"            items={report.insights.gaps} />
          <InsightColumn type="recommendations" items={report.insights.recommendations} />
        </div>

        {/* Competitive snapshot */}
        {competitorRows.length > 0 && (
          <div style={{ padding: '0 16px 8px' }}>
            <div style={{ border: `1px solid ${C.lightGrey}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ backgroundColor: C.navy, padding: '4px 10px' }}>
                <span style={{ color: C.white, fontWeight: 600, fontSize: 8.5 }}>⚡ Competitive Snapshot</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
                <thead>
                  <tr style={{ backgroundColor: C.lightGrey }}>
                    {['Domain', 'Total', 'Technical', 'Authority', 'Brand', 'AI Vis.'].map((h, i) => (
                      <th key={i} style={{ padding: '3px 8px', textAlign: i === 0 ? 'left' : 'center', color: C.charcoal, fontWeight: 600, fontSize: 7.5, borderBottom: `1px solid ${C.lightPurple}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {competitorRows.map((row, i) => (
                    <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${C.lightGrey}` : 'none', backgroundColor: C.white }}>
                      <td style={{ padding: '3px 8px', color: C.black, fontWeight: row.isSubject ? 600 : 400 }}>
                        {row.domain}
                        {row.isSubject && (
                          <span style={{ marginLeft: 4, fontSize: 6.5, fontWeight: 600, backgroundColor: C.blue, color: C.white, padding: '1px 4px', borderRadius: 3 }}>You</span>
                        )}
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', color: scoreColor(row.totalScore, 100), fontWeight: 700, fontSize: 10 }}>{row.totalScore}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', color: C.charcoal }}>{row.technical}/25</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', color: C.charcoal }}>{row.searchAuthority}/35</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', color: C.charcoal }}>{row.brandPresence}/20</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', color: C.charcoal }}>{row.aiVisibility}/20</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ backgroundColor: C.navy2, padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: C.lightPurple, fontSize: 7.5 }}>Generated {formatDate(report.createdAt)} by demandDrive AI Insights</span>
          <span style={{ color: C.lightPurple, fontSize: 7.5 }}>{report.domain}</span>
        </div>

      </div>
    </>
  );
}
