import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { redis } from '@/lib/redis';
import { generateMockReport, recomputeDerivedFields } from '@/lib/mock';
import { runAiPlatformProbes, generateCrossPlatformInsight, buildAiVisibilityBucket } from '@/lib/ai-probes';

function normalizeDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

function generateSlug(domain: string): string {
  const base = domain.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase();
  // crypto.randomUUID() guarantees a fresh, unique suffix on every call regardless of domain.
  // Math.random() can return 0 or near-0, collapsing the suffix to empty/short and risking slug reuse.
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `${base}-${id}`;
}

function domainFallbackName(domain: string): string {
  return domain.replace(/^www\./, '').replace(/\.(com|io|co|net|org|ai)(\/.*)?$/, '');
}

// Low-quality keyword signals to exclude from SEMRush probe keywords.
const KEYWORD_STOPWORDS = ['what is', 'how to', 'basics', 'definition', 'tutorial', 'guide', ' vs ', 'meaning'];

// Maps SEMRush intent codes to a numeric score used in keyword ranking.
// Per SEMRush docs: 0 = informational, 1 = navigational, 2 = commercial, 3 = transactional.
// User-facing label mapping: commercial (1) and transactional (2) only pass the intent filter.
function intentScore(intentField: string): number {
  const values = intentField.split(',').map(s => s.trim());
  if (values.includes('2')) return 100;  // transactional
  if (values.includes('1')) return 75;   // commercial
  if (values.includes('0')) return 25;   // informational (filtered out before ranking, but safe default)
  return 0;                              // navigational
}

// Fetch top non-branded organic keywords from SEMRush to use as probe category context.
// Returns up to 3 keywords: commercial/transactional intent only, filtered for quality,
// ranked by combined volume + keyword difficulty + intent signal.
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
    url.searchParams.set('export_columns', 'Ph,Nq,Kd,In');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const text = await res.text();

    const brandLower = brandName.toLowerCase();
    const keywords = text
      .trim()
      .split('\n')
      .slice(1)                    // skip header row
      .map(line => {
        const parts = line.split(';');
        const kw     = (parts[0] ?? '').trim();
        const vol    = parseInt((parts[1] ?? '0').trim(), 10);
        const kd     = parseInt((parts[2] ?? '0').trim(), 10);
        const intent = (parts[3] ?? '').trim();
        return { kw, vol, kd, intent };
      })
      // Hard quality filters
      .filter(({ kw, intent }) => {
        if (kw.length < 12) return false;
        if (kw.toLowerCase().includes(brandLower)) return false;
        if (KEYWORD_STOPWORDS.some(stop => kw.toLowerCase().includes(stop))) return false;
        if (kw.trim().split(/\s+/).length < 2) return false;                      // at least 2 words
        if (kw.trim().split(/\s+/).some(word => /^[A-Z]/.test(word))) return false; // no proper nouns
        // Only commercial (1) or transactional (2) intent
        const intentValues = intent.split(',').map(s => s.trim());
        if (!intentValues.some(v => v === '1' || v === '2')) return false;
        return true;
      })
      // Rank by combined signal: vol (0.4) + kd (0.3) + intent (0.3)
      .sort((a, b) => {
        const scoreA = a.vol * 0.4 + a.kd * 0.3 + intentScore(a.intent) * 0.3;
        const scoreB = b.vol * 0.4 + b.kd * 0.3 + intentScore(b.intent) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 3)
      .map(({ kw }) => kw);

    return keywords;
  } catch {
    return [];
  }
}

// Use Claude to filter candidate SEMRush keywords down to those representing the company's
// core products, services, or capabilities. Falls back to the unvalidated list on any failure.
async function validateKeywordsWithClaude(
  domain: string,
  brandName: string,
  industry: string | undefined,
  keywords: string[],
): Promise<string[]> {
  if (!keywords.length) return keywords;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const industryLine = industry ? `Industry: ${industry}\n` : '';
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are a B2B marketing analyst. Your job is to determine which keywords are directly related to a company's core products, services, or capabilities -- not their clients, case studies, content topics, or accidental rankings. Return ONLY a valid JSON array of the relevant keywords, nothing else.`,
      messages: [{
        role: 'user',
        content: `Company domain: ${domain}\nBrand name: ${brandName}\n${industryLine}Candidate keywords: ${keywords.join(', ')}\n\nReturn only the keywords that represent core products, services, or capabilities this company likely sells. Exclude any that appear to be client names, company names, content topics, or unrelated terms. Return a JSON array of strings.`,
      }],
    });
    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((k): k is string => typeof k === 'string')) {
      // Cap at 5, then intersect with original list to prevent hallucination
      const validated = parsed
        .filter(k => keywords.includes(k))
        .slice(0, 5);
      return validated.length ? validated : keywords;
    }
    return keywords;
  } catch {
    return keywords;
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

    // Parse manual key topics if provided (comma-separated, trimmed, non-empty, max 3)
    const rawKeyTopics: string = body.keyTopics?.trim() || '';
    const manualKeywords: string[] = rawKeyTopics
      ? rawKeyTopics.split(',').map((k: string) => k.trim()).filter(Boolean).slice(0, 3)
      : [];

    const slug = generateSlug(domain);
    const shareToken = crypto.randomUUID().replace(/-/g, '');
    const ind = industry || 'technology';
    const firstCompetitor = competitors[0];

    // Phase 1: mock report (non-AI buckets) runs in parallel with SEMRush keyword fetch
    // (SEMRush fetch is skipped if manual keywords were supplied)
    let keywordSource: 'manual' | 'semrush' | 'fallback';
    let categoryKeywords: string[];

    if (manualKeywords.length >= 2) {
      // Manual keywords take full priority — skip SEMRush fetch entirely
      categoryKeywords = manualKeywords;
      keywordSource = 'manual';
      const mockReport = generateMockReport(domain, slug, industry, competitors, brandName);
      const [platformScores, competitorPlatformScores] = await Promise.all([
        runAiPlatformProbes(brandName, ind, categoryKeywords),
        firstCompetitor
          ? runAiPlatformProbes(domainFallbackName(firstCompetitor), ind, categoryKeywords)
          : Promise.resolve(null),
      ]);

      const crossPlatformInsight = await generateCrossPlatformInsight(brandName, platformScores);
      const aiVisibility = buildAiVisibilityBucket(platformScores, crossPlatformInsight);

      const totalScore =
        mockReport.buckets.technical.earned +
        mockReport.buckets.searchAuthority.earned +
        mockReport.buckets.brandPresence.earned +
        aiVisibility.earned;

      let competitorReports = mockReport.competitorReports;
      if (competitorPlatformScores && competitorReports?.length) {
        competitorReports = [
          { ...competitorReports[0], aiPlatformScores: competitorPlatformScores },
          ...competitorReports.slice(1),
        ];
      }

      // Build base report with live aiVisibility bucket, then recompute all three
      // AI-score-dependent derived fields so they reflect the actual live scores.
      const reportBase = {
        ...mockReport,
        totalScore,
        keywordSource,
        buckets: { ...mockReport.buckets, aiVisibility },
        competitorReports,
      };
      const report = { ...reportBase, ...recomputeDerivedFields(reportBase, aiVisibility, totalScore) };

      const reportWithToken = { ...report, shareToken };
      await Promise.all([
        redis.set(`report:${slug}`, reportWithToken),
        redis.set(`share:${shareToken}`, slug),
      ]);
      return NextResponse.json({ slug });
    }

    // No manual keywords — fetch from SEMRush in parallel with mock report
    const [mockReport, semrushKeywords] = await Promise.all([
      Promise.resolve(generateMockReport(domain, slug, industry, competitors, brandName)),
      fetchCategoryKeywords(domain, brandName),
    ]);

    if (semrushKeywords.length >= 2) {
      // Validate with Claude to strip client names, branded terms, and off-topic rankings
      const validated = await validateKeywordsWithClaude(domain, brandName, industry, semrushKeywords);
      categoryKeywords = validated;
      keywordSource = 'semrush';
    } else {
      categoryKeywords = [];
      keywordSource = 'fallback';
    }

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

    // Build base report with live aiVisibility bucket, then recompute all three
    // AI-score-dependent derived fields so they reflect the actual live scores.
    const reportBase = {
      ...mockReport,
      totalScore,
      keywordSource,
      buckets: { ...mockReport.buckets, aiVisibility },
      competitorReports,
    };
    const report = { ...reportBase, ...recomputeDerivedFields(reportBase, aiVisibility, totalScore) };

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
