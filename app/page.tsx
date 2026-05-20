'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// ─── Brand palette ────────────────────────────────────────────────────────────
const C = {
  navy:      '#0A0E45',
  blue:      '#0062DF',
  orange:    '#FF6300',
  green:     '#00DD84',
  white:     '#ffffff',
  navy2:     '#0E0E3B',
  lightGrey: '#F5F6FE',
  charcoal:  '#59596D',
  black:     '#00002E',
} as const;

interface FormState {
  domain: string;
  brandName: string;
  industry: string;
  competitor1: string;
  competitor2: string;
  competitor3: string;
}

const STAGES = [
  { label: 'Analyzing technical foundation',   duration: 900  },
  { label: 'Pulling search authority signals',  duration: 1200 },
  { label: 'Measuring brand presence',          duration: 900  },
  { label: 'Running AI visibility probes',      duration: 1500 },
  { label: 'Generating strategic insights',     duration: 1000 },
];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    domain: '', brandName: '', industry: '', competitor1: '', competitor2: '', competitor3: '',
  });
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [error, setError] = useState('');

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.domain.trim()) { setError('Please enter a domain.'); return; }
    setError('');
    setLoading(true);
    setStageIndex(0);

    const apiPromise = fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    for (let i = 0; i < STAGES.length; i++) {
      setStageIndex(i);
      await sleep(STAGES[i].duration);
    }

    try {
      const res = await apiPromise;
      const data = await res.json();
      if (!res.ok || !data.slug) throw new Error(data.error || 'Analysis failed');
      router.push(`/report/${data.slug}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      setLoading(false);
      setStageIndex(-1);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 transition-shadow";
  const inputStyle = {
    border: `1px solid ${C.lightGrey}`,
    color: C.black,
    backgroundColor: C.white,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.lightGrey }}>

      {/* Nav */}
      <header style={{ backgroundColor: C.navy }}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://emjqwdk52dd.exactdn.com/wp-content/uploads/2025/12/Logo-Dark-Mode.svg" alt="demandDrive" style={{ height: 32 }} />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">

          {/* Hero copy */}
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: C.white, color: C.blue, border: `1px solid ${C.lightGrey}`, fontWeight: 500 }}
            >
              🤖 AI-Powered Scoring
            </div>
            <h1 className="text-3xl leading-tight" style={{ color: C.black, fontWeight: 700 }}>
              AI Visibility Score
            </h1>
            <p className="mt-3 text-base leading-relaxed" style={{ color: C.charcoal }}>
              Enter any domain to get a proprietary 0–100 visibility score, bucket breakdowns, and strategic insights — built for B2B sales conversations.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl shadow-sm p-8" style={{ backgroundColor: C.white, border: `1px solid ${C.lightGrey}` }}>
            {!loading ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: C.navy, fontWeight: 600 }}>
                    Domain <span style={{ color: C.orange }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="example.com"
                    value={form.domain}
                    onChange={update('domain')}
                    disabled={loading}
                    className={inputClass}
                    style={{ ...inputStyle, boxShadow: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: C.navy, fontWeight: 600 }}>
                    Brand Name <span className="font-normal" style={{ color: C.charcoal }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HubSpot (auto-detected if left blank)"
                    value={form.brandName}
                    onChange={update('brandName')}
                    disabled={loading}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: C.navy, fontWeight: 600 }}>
                    Industry <span className="font-normal" style={{ color: C.charcoal }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B2B SaaS, Healthcare, Fintech"
                    value={form.industry}
                    onChange={update('industry')}
                    disabled={loading}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: C.navy, fontWeight: 600 }}>
                    Competitors <span className="font-normal" style={{ color: C.charcoal }}>(optional)</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    {(['competitor1', 'competitor2', 'competitor3'] as const).map((key, i) => (
                      <input
                        key={key}
                        type="text"
                        placeholder={`competitor${i + 1}.com`}
                        value={form[key]}
                        onChange={update(key)}
                        disabled={loading}
                        className={inputClass}
                        style={inputStyle}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm rounded-lg px-4 py-3" style={{ color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: C.blue, color: C.white, fontWeight: 600 }}
                >
                  Analyze Domain →
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-6 py-2">
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
                    style={{ border: `4px solid ${C.lightGrey}`, borderTopColor: C.blue }}
                  />
                  <p className="text-sm font-semibold" style={{ color: C.navy, fontWeight: 600 }}>
                    {stageIndex >= 0 ? STAGES[stageIndex].label + '…' : 'Starting analysis…'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: C.charcoal }}>
                    Analyzing <span style={{ color: C.black, fontWeight: 500 }}>{form.domain}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {STAGES.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 transition-all"
                        style={{
                          backgroundColor: i < stageIndex ? C.green : i === stageIndex ? C.blue : C.lightGrey,
                          color: i < stageIndex || i === stageIndex ? C.white : C.charcoal,
                          fontWeight: 700,
                        }}
                      >
                        {i < stageIndex ? '✓' : i === stageIndex ? '…' : ''}
                      </div>
                      <span
                        className="text-sm transition-colors"
                        style={{
                          color: i < stageIndex ? C.charcoal : i === stageIndex ? C.black : C.charcoal,
                          fontWeight: i === stageIndex ? 500 : 400,
                          textDecoration: i < stageIndex ? 'line-through' : 'none',
                        }}
                      >
                        {stage.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs mt-6" style={{ color: C.charcoal }}>
            Reports are saved and shareable via unique URL. No login required.
          </p>
        </div>
      </main>

      <footer style={{ backgroundColor: C.navy2 }}>
        <div className="py-6 text-center text-xs" style={{ color: C.white }}>
          © {new Date().getFullYear()} demandDrive · For internal use only
        </div>
      </footer>
    </div>
  );
}
