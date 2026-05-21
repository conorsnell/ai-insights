import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { generateMockReport } from '@/lib/mock';
import { runAiPlatformProbes, generateCrossPlatformInsight, buildAiVisibilityBucket } from '@/lib/ai-probes';

function normalizeDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

function generateSlug(domain: string): string {
  const base = domain.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase();
  const id = Math.random().toString(36).slice(2, 8);
  return `${base}-${id}`;
}

function domainFallbackName(domain: string): string {
  return domain.replace(/^www\./, '').replace(/\.(com|io|co|net|org|ai)(\/.*)?$/, '');
}

// Fetch top non-branded organic keywords from SEMRush to use as probe category context.
// Returns up to 3 keywords sorted by search volume, filtered to exclude branded terms.
// Falls back to [] if SEMRush is unavailable, so callers fall back to industry probes.
async function fetchCategoryKeywords(domain: string, brandName: string): Promise<string[]> {
  if (!process.env.SEMRUSH_API_KEY) return [];
  try {
    const url = new URL('https://api.semrush.com/');
    url.searchParams.set('type', 'domain_organic');
    url.searchParams.set('key', process.env.SEMRUSH_API_KEY);
    url.searchParams.set('domain', domain);
    url.searchParams.set('database', 'us');
    url.searchParams.set('display_limit', '50');
    url.searchParams.set('display_sort', 'nq_desc');
    url.searchParams.set('export_columns', 'Ph,Nq');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const text = await res.text();

    const brandLower = brandName.toLowerCase();
    const keywords = text
      .trim()
      .split('\n')
      .slice(1)                    // skip header row
      .map(line => {
        const [kw, vol] = line.split(';');
        return { kw: (kw ?? '').trim(), vol: parseInt((vol ?? '0').trim(), 10) };
      })
      .filter(({ kw }) => kw.length > 0 && !kw.toLowerCase().includes(brandLower))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 3)
      .map(({ kw }) => kw);

    return keywords;
  } catch {
    return [];
  }
}

async function detectBrandName(domain: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}/`, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Insights-Bot/1.0)' },
    });
    const html = await res.text();

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
    if (ogMatch?.[1]?.trim()) return ogMatch[1].trim();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch?.[1]) {
      let t = titleMatch[1].trim();
      t = t.replace(/\s*[\|–—\-]\s*(Home|Official Site|Official Website|Homepage|Welcome).*$/i, '');
      t = t.replace(/\s*[\|–—\-]\s*.+$/, '');
      if (t.trim()) return t.trim();
    }

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match?.[1]?.trim()) return h1Match[1].trim();
  } catch {
    // fall through
  }
  return domainFallbackName(domain);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const domain = normalizeDomain(body.domain || '');

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const industry: string | undefined = body.industry?.trim() || undefined;
    const competitors: string[] = [body.competitor1, body.competitor2, body.competitor3]
      .filter(Boolean)
      .map((c: string) => normalizeDomain(c));

    const brandName: string = body.brandName?.trim()
      ? body.brandName.trim()
      : await detectBrandName(domain);

    const slug = generateSlug(domain);
    const shareToken = Math.random().toString(36).slice(2, 14);
    const ind = industry || 'technology';
    const firstCompetitor = competitors[0];

    // Phase 1: mock report (non-AI buckets) and SEMRush keyword fetch run in parallel
    const [mockReport, categoryKeywords] = await Promise.all([
      Promise.resolve(generateMockReport(domain, slug, industry, competitors, brandName)),
      fetchCategoryKeywords(domain, brandName),
    ]);

    // Phase 2: AI probes use category keywords when available, fall back to industry probes
    const [platformScores, competitorPlatformScores] = await Promise.all([
      runAiPlatformProbes(brandName, ind, categoryKeywords.length >= 2 ? categoryKeywords : undefined),
      firstCompetitor
        ? runAiPlatformProbes(domainFallbackName(firstCompetitor), ind, categoryKeywords.length >= 2 ? categoryKeywords : undefined)
        : Promise.resolve(null),
    ]);

    const crossPlatformInsight = await generateCrossPlatformInsight(brandName, platformScores);
    const aiVisibility = buildAiVisibilityBucket(platformScores, crossPlatformInsight);

    const totalScore =
      mockReport.buckets.technical.earned +
      mockReport.buckets.searchAuthority.earned +
      mockReport.buckets.brandPresence.earned +
      aiVisibility.earned;

    // Attach competitor AI platform scores to the first competitor summary
    let competitorReports = mockReport.competitorReports;
    if (competitorPlatformScores && competitorReports?.length) {
      competitorReports = [
        { ...competitorReports[0], aiPlatformScores: competitorPlatformScores },
        ...competitorReports.slice(1),
      ];
    }

    const report = {
      ...mockReport,
      totalScore,
      buckets: { ...mockReport.buckets, aiVisibility },
      competitorReports,
    };

    const reportWithToken = { ...report, shareToken };

    await Promise.all([
      redis.set(`report:${slug}`, reportWithToken),
      redis.set(`share:${shareToken}`, slug),
    ]);

    return NextResponse.json({ slug });
  } catch (err) {
    console.error('/api/analyze error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
