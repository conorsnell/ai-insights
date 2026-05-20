import type { Report, BucketScore, AiBucketScore, BucketSummaries, Insights, AiPlatformScore, AiPlatformProbeResult, PerplexityProbe } from './types';
import { PLATFORM_CONFIG } from './platform-config';

function domainSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = Math.imul(48271, s) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Math.round(v)));
}

function brandName(domain: string): string {
  return domain.replace(/^www\./, '').replace(/\.(com|io|co|net|org|ai)(\/.*)?$/, '');
}

function mockPlatformScores(
  rng: () => number,
  name: string,
  ind: string,
): AiPlatformScore[] {
  const prompts = [
    `What is ${name}?`,
    `Who are the top ${ind} companies?`,
    `What do people say about ${name}?`,
  ];

  const snippets = [
    [`${name} is a ${ind} company recognized for`, `Several ${ind} firms are notable. ${name} is among those`, undefined],
    [`Leading ${ind} companies include ${name}, which has built`, `The ${ind} market is competitive. ${name} is one of the players`, undefined],
    [`Customers of ${name} frequently highlight their`, `Reviews of ${name} are generally positive, with some users noting`, undefined],
  ];

  return (['Perplexity', 'ChatGPT', 'Gemini', 'Claude'] as const).map(platform => {
    const config = PLATFORM_CONFIG[platform];
    const probeResults: AiPlatformProbeResult[] = config.probeMaxes.map((max, i) => {
      const mentioned = rng() > 0.38;
      const prominent = mentioned && rng() > 0.42;
      const score = prominent ? max : mentioned ? Math.floor(max / 2) : 0;
      return {
        prompt: prompts[i],
        score,
        maxScore: max,
        snippet: score > 0 ? snippets[i][prominent ? 0 : 1] : undefined,
      };
    });
    return {
      platform,
      score: probeResults.reduce((s, p) => s + p.score, 0),
      maxScore: config.maxScore,
      available: true,
      probeResults,
    };
  });
}

function mockCrossPlatformInsight(name: string, scores: AiPlatformScore[]): string {
  const sorted = [...scores].sort((a, b) => (b.score / b.maxScore) - (a.score / a.maxScore));
  const top = sorted[0].platform;
  const bottom = sorted[sorted.length - 1].platform;
  const topPct = Math.round((sorted[0].score / sorted[0].maxScore) * 100);
  const bottomPct = Math.round((sorted[sorted.length - 1].score / sorted[sorted.length - 1].maxScore) * 100);
  if (Math.abs(topPct - bottomPct) < 20) {
    return `${name} shows relatively consistent AI visibility across all four platforms, suggesting broad citation presence across search and LLM ecosystems.`;
  }
  return `${name} shows its strongest AI presence on ${top} but limited visibility on ${bottom}, suggesting citation depth that favors some retrieval architectures over others.`;
}

function mockBucketSummaries(
  name: string,
  ind: string,
  techPts: number,
  sitemapPts: number,
  cwvPts: number,
  faqPts: number,
  authPts: number,
  authorityRaw: number,
  referringDomains: number,
  keywordCount: number,
  brandedPct: number,
  mentionCount: number,
  citationCount: number,
  aiPts: number,
  platformScores: AiPlatformScore[],
): BucketSummaries {
  const platformSummary = platformScores
    .map(p => `${p.platform} ${p.score}/${p.maxScore}`)
    .join(', ');
  const platformsAboveHalf = platformScores.filter(p => p.score >= p.maxScore / 2).length;

  return {
    technical: `${name} scores ${techPts}/25 on technical foundation. ${sitemapPts > 0 ? 'A valid sitemap is present, which aids AI crawler ingestion.' : 'No valid sitemap was detected, which limits AI crawler access.'} Core Web Vitals ${cwvPts >= 5 ? 'are healthy' : 'show room for improvement'}, and ${faqPts > 0 ? 'FAQ-structured content provides structured Q&A signals that AI platforms favor' : 'FAQ schema is absent — a missed opportunity to feed AI answer boxes'}.`,

    authority: `${name} holds an authority score of ${authorityRaw}/100 with ${referringDomains.toLocaleString()} referring domains, indicating ${authorityRaw >= 50 ? 'solid' : 'developing'} link equity that AI platforms use to weight source credibility. The site ranks for ${keywordCount.toLocaleString()} keywords, but ${brandedPct}% are branded — meaning the majority of organic footprint is tied to people already searching for ${name} by name rather than topical discovery.`,

    brand: `${name} generates ${mentionCount} brand mentions per month and is cited across ${citationCount} off-platform domains. ${mentionCount >= 200 ? 'This level of mention velocity is a strong signal that the brand is actively discussed in the wider ecosystem.' : 'Mention velocity is moderate — growing earned media and off-platform presence would directly lift this bucket.'} Off-platform citations are a key input for AI platforms when determining which brands are worth surfacing.`,

    aiVisibility: `${name} earns ${aiPts}/20 on estimated AI visibility across four platforms (${platformSummary}). ${platformsAboveHalf >= 3 ? 'Consistent presence across most platforms suggests strong brand recognition in AI training data and live retrieval.' : platformsAboveHalf === 0 ? 'Absence from all four probes is a significant gap — AI platforms are not surfacing this brand in response to direct buyer queries.' : 'Partial platform coverage means the brand appears in some AI contexts but is missing from others, representing an opportunity to strengthen AI-facing content and citations.'}`,
  };
}

function mockExecutiveSummary(
  name: string,
  ind: string,
  totalScore: number,
  techPts: number,
  authPts: number,
  brandPts: number,
  aiPts: number,
  authorityRaw: number,
  referringDomains: number,
  brandedPct: number,
  mentionCount: number,
  platformScores: AiPlatformScore[],
): string[] {
  const probesHit = platformScores.reduce((n, p) => n + p.probeResults.filter(pr => pr.score > 0).length, 0);
  const totalProbes = platformScores.length * 3;

  function tier(pts: number, max: number): string {
    const pct = pts / max;
    if (pct >= 0.75) return 'strong';
    if (pct >= 0.55) return 'moderate';
    if (pct >= 0.35) return 'developing';
    return 'weak';
  }

  const buckets = [
    {
      pts: aiPts,
      max: 20,
      bullet: aiPts / 20 >= 0.55
        ? `AI Visibility is ${tier(aiPts, 20)} at ${aiPts}/20 — ${name} appeared in ${probesHit}/${totalProbes} cross-platform probes, indicating meaningful brand recognition across AI retrieval systems in the ${ind} space.`
        : aiPts / 20 >= 0.35
        ? `AI Visibility is ${tier(aiPts, 20)} at ${aiPts}/20 — ${name} appeared in ${probesHit}/${totalProbes} cross-platform probes, showing partial AI presence with clear headroom to improve generative search visibility.`
        : `AI Visibility is the most critical gap at ${aiPts}/20 — ${name} appeared in only ${probesHit}/${totalProbes} cross-platform probes, meaning buyers evaluating ${ind} vendors via AI are largely not seeing the brand.`,
    },
    {
      pts: authPts,
      max: 35,
      bullet: authPts / 35 >= 0.55
        ? `Search Authority is ${tier(authPts, 35)} at ${authPts}/35 — a domain authority of ${authorityRaw}/100 with ${referringDomains.toLocaleString()} referring domains provides solid credibility, though ${brandedPct}% branded keyword share signals room for topical content growth.`
        : `Search Authority is ${tier(authPts, 35)} at ${authPts}/35 — an authority score of ${authorityRaw}/100 with ${referringDomains.toLocaleString()} referring domains provides a foundation, but ${brandedPct}% branded keyword share limits topical discovery and the credibility signals AI platforms use to weight sources.`,
    },
    {
      pts: brandPts,
      max: 20,
      bullet: brandPts / 20 >= 0.55
        ? `Brand Presence is ${tier(brandPts, 20)} at ${brandPts}/20 — ${mentionCount.toLocaleString()} monthly brand mentions indicate active industry discussion and provide the off-platform citation signals AI platforms rely on to surface credible brands.`
        : `Brand Presence is ${tier(brandPts, 20)} at ${brandPts}/20 — ${mentionCount.toLocaleString()} monthly mentions indicate emerging recognition, but growing earned media and off-platform citations would directly strengthen AI discoverability.`,
    },
    {
      pts: techPts,
      max: 25,
      bullet: techPts / 25 >= 0.55
        ? `Technical Foundation is ${tier(techPts, 25)} at ${techPts}/25 — sitemap, schema markup, and Core Web Vitals are in good shape, providing a well-structured base for both traditional crawlers and AI ingestion pipelines.`
        : `Technical Foundation is ${tier(techPts, 25)} at ${techPts}/25 — gaps in structured data, FAQ schema, or Core Web Vitals reduce how effectively AI crawlers can ingest and represent ${name}'s content.`,
    },
  ].sort((a, b) => (a.pts / a.max) - (b.pts / b.max)); // weakest first

  return buckets.map(b => b.bullet);
}

function mockInsights(
  domain: string,
  industry: string | undefined,
  totalScore: number,
  techPts: number,
  authPts: number,
  brandPts: number,
  aiPts: number,
  authorityRaw: number,
  referringDomains: number,
  keywordCount: number,
  brandedPct: number,
  mentionCount: number,
  platformScores: AiPlatformScore[],
): Insights {
  const name = brandName(domain);
  const ind = industry || 'their industry';
  const probesHit = platformScores.reduce((n, p) => n + p.probeResults.filter(pr => pr.score > 0).length, 0);
  const totalProbes = platformScores.length * 3;

  return {
    strengths: [
      {
        title: 'Solid Technical Infrastructure',
        detail: `${name} scores ${techPts}/25 on technical foundation. Sitemap, schema markup, and Core Web Vitals are all in acceptable shape — the site is structurally ready for both traditional crawlers and AI ingestion pipelines.`,
      },
      {
        title: `Domain Authority at ${authorityRaw}/100`,
        detail: `With an authority score of ${authorityRaw} and ${referringDomains.toLocaleString()} referring domains, ${name} has built meaningful link equity. This is a credibility signal AI platforms use when determining which sources to surface.`,
      },
      {
        title: `${mentionCount.toLocaleString()} Brand Mentions per Month`,
        detail: `${name}'s brand mention velocity is ${brandPts >= 14 ? 'strong' : 'moderate'}, indicating real-world recognition. Consistent off-platform citations reinforce that this is an established player in ${ind}.`,
      },
    ],
    gaps: [
      {
        title: 'AI Visibility Is Underdeveloped',
        detail: `${name} appears in only ${probesHit}/${totalProbes} cross-platform AI probes, scoring ${aiPts}/20 on AI visibility. As buyers increasingly use AI to shortlist vendors, low presence in generative AI responses is a meaningful revenue risk.`,
      },
      {
        title: 'Thin Branded-to-Topical Keyword Ratio',
        detail: `${brandedPct}% of organic keywords are branded — meaning most traffic comes from people already searching for ${name} by name. With only ${keywordCount.toLocaleString()} topical keywords, the site is missing significant top-of-funnel exposure in ${ind}.`,
      },
      {
        title: 'Limited FAQ and Structured Content',
        detail: `FAQ schema and Q&A-structured content are key inputs for AI snippet generation. ${name} currently has minimal FAQ markup, reducing the likelihood of appearing in AI-generated overviews and answer boxes.`,
      },
    ],
    recommendations: [
      {
        title: 'Build an AI-Optimized FAQ Hub',
        detail: `Create a dedicated FAQ or resource section with FAQ schema markup targeting the questions buyers ask in ${ind}. This directly feeds generative AI platforms and increases the probability of brand inclusion in AI responses.`,
      },
      {
        title: 'Pursue Unbranded Topical Content at Scale',
        detail: `Develop a systematic content program targeting non-branded ${ind} keywords. Every high-ranking piece on a topical query is a potential citation source for AI models — diversifying beyond brand traffic also reduces algorithmic volatility.`,
      },
      {
        title: 'Activate a Proactive PR and Citations Strategy',
        detail: `${name}'s multi-platform AI probe performance can be improved by earning mentions in industry media, analyst reports, and high-authority directories. AI platforms pull from these same citation sources — earned media directly improves AI visibility across ChatGPT, Gemini, Perplexity, and Claude.`,
      },
    ],
  };
}

export function generateMockReport(
  domain: string,
  slug: string,
  industry?: string,
  competitors?: string[],
  resolvedBrandName?: string,
): Report {
  const rng = seededRng(domainSeed(domain));

  // Technical Foundation (25 pts)
  const sitemapPts = rng() > 0.2 ? 4 : 0;
  const schemaPts = clamp(rng() * 5 + 1, 1, 5);
  const faqPts = clamp(rng() * 4, 0, 4);
  const cwvPts = clamp(rng() * 5 + 2, 2, 7);
  const mobilePts = clamp(rng() * 3 + 2, 2, 5);

  const technical: BucketScore = {
    earned: sitemapPts + schemaPts + faqPts + cwvPts + mobilePts,
    possible: 25,
    signals: [
      { name: 'Sitemap present and valid', earned: sitemapPts, possible: 4, source: 'Direct fetch', rawValue: sitemapPts > 0 },
      { name: 'Schema markup present', earned: schemaPts, possible: 5, source: 'HTML parse', rawValue: schemaPts > 0 ? 'Organization, WebPage' : 'None detected' },
      { name: 'FAQ schema or FAQ section', earned: faqPts, possible: 4, source: 'HTML parse', rawValue: faqPts > 2 ? 'FAQ schema found' : faqPts > 0 ? 'FAQ section (no schema)' : 'Not found' },
      { name: 'Core Web Vitals pass', earned: cwvPts, possible: 7, source: 'PageSpeed Insights', rawValue: `LCP: ${(rng() * 2 + 1.5).toFixed(1)}s, CLS: ${(rng() * 0.15).toFixed(2)}, INP: ${Math.round(rng() * 200 + 50)}ms` },
      { name: 'Mobile usability score', earned: mobilePts, possible: 5, source: 'PageSpeed Insights', rawValue: `${Math.round(mobilePts / 5 * 100)}/100` },
    ],
  };

  // Search Authority (35 pts)
  const authorityRaw = clamp(rng() * 55 + 20, 20, 75);
  const authPts = clamp((authorityRaw / 100) * 10, 2, 10);
  const referringDomains = clamp(rng() * 8000 + 500, 500, 8500);
  const refPts = clamp((Math.log10(referringDomains) / Math.log10(50000)) * 8, 2, 8);
  const toxicPct = clamp(rng() * 18, 2, 18);
  const toxicPts = clamp((1 - toxicPct / 100) * 5, 3, 5);
  const keywordCount = clamp(rng() * 15000 + 1000, 1000, 16000);
  const kwPts = clamp((Math.log10(keywordCount) / Math.log10(50000)) * 7, 2, 7);
  const brandedPct = clamp(rng() * 35 + 8, 8, 40);
  const brandedPts = clamp(((30 - brandedPct) / 30) * 5, 1, 5);

  const searchAuthority: BucketScore = {
    earned: Math.round(authPts + refPts + toxicPts + kwPts + brandedPts),
    possible: 35,
    signals: [
      { name: 'Authority Score', earned: Math.round(authPts), possible: 10, source: 'SEMrush Domain Overview', rawValue: authorityRaw },
      { name: 'Referring domains', earned: Math.round(refPts), possible: 8, source: 'SEMrush Backlinks', rawValue: referringDomains.toLocaleString() },
      { name: 'Backlink toxicity (inverse)', earned: Math.round(toxicPts), possible: 5, source: 'SEMrush Backlinks', rawValue: `${toxicPct}% toxic` },
      { name: 'Topical keyword coverage', earned: Math.round(kwPts), possible: 7, source: 'SEMrush Organic Research', rawValue: `${keywordCount.toLocaleString()} keywords` },
      { name: 'Branded keyword mix', earned: Math.round(brandedPts), possible: 5, source: 'SEMrush Organic Research', rawValue: `${brandedPct}% branded` },
    ],
  };

  // Brand Presence (20 pts)
  const mentionCount = clamp(rng() * 400 + 50, 50, 450);
  const mentionPts = clamp((Math.log10(mentionCount) / Math.log10(600)) * 10, 2, 10);
  const citationCount = clamp(rng() * 150 + 20, 20, 170);
  const citationPts = clamp((Math.log10(citationCount) / Math.log10(300)) * 10, 2, 10);

  const brandPresence: BucketScore = {
    earned: Math.round(mentionPts + citationPts),
    possible: 20,
    signals: [
      { name: 'Brand mention velocity', earned: Math.round(mentionPts), possible: 10, source: 'SEMrush Brand Monitoring', rawValue: `${mentionCount} mentions/mo` },
      { name: 'Off-platform citation count', earned: Math.round(citationPts), possible: 10, source: 'SEMrush Backlinks', rawValue: `${citationCount} citing domains` },
    ],
  };

  // AI Visibility (20 pts) — multi-platform
  const name = resolvedBrandName || brandName(domain);
  const ind = industry || 'technology';

  const aiPlatformScores = mockPlatformScores(rng, name, ind);
  const totalAiScore = aiPlatformScores.reduce((s, p) => s + p.score, 0);
  const crossPlatformInsight = mockCrossPlatformInsight(name, aiPlatformScores);

  // Legacy probes from Perplexity data
  const perpData = aiPlatformScores.find(p => p.platform === 'Perplexity')!;
  const legacyProbes: PerplexityProbe[] = perpData.probeResults.map(pr => ({
    prompt: pr.prompt,
    earned: pr.score,
    possible: pr.maxScore,
    mentioned: pr.score > 0,
    prominent: pr.score === pr.maxScore && pr.maxScore > 0,
    excerpt: pr.snippet,
  }));

  const aiVisibility: AiBucketScore = {
    earned: totalAiScore,
    possible: 20,
    available: true,
    probes: legacyProbes,
    aiPlatformScores,
    crossPlatformInsight,
    signals: aiPlatformScores.map(p => ({
      name: `${p.platform} AI visibility`,
      earned: p.score,
      possible: p.maxScore,
      source: p.platform === 'ChatGPT' ? 'OpenAI API' : p.platform === 'Gemini' ? 'Google AI API' : p.platform === 'Claude' ? 'Anthropic API' : 'Perplexity API',
      rawValue: `${p.score}/${p.maxScore} pts`,
    })),
  };

  const totalScore = technical.earned + searchAuthority.earned + brandPresence.earned + aiVisibility.earned;

  const insights = mockInsights(
    domain, industry, totalScore,
    technical.earned, searchAuthority.earned, brandPresence.earned, aiVisibility.earned,
    authorityRaw, referringDomains, keywordCount, brandedPct, mentionCount, aiPlatformScores,
  );

  const executiveSummary = mockExecutiveSummary(
    name, ind, totalScore,
    technical.earned, searchAuthority.earned, brandPresence.earned, aiVisibility.earned,
    authorityRaw, referringDomains, brandedPct, mentionCount, aiPlatformScores,
  );

  const bucketSummaries = mockBucketSummaries(
    name, ind,
    technical.earned, sitemapPts, cwvPts, faqPts,
    searchAuthority.earned, authorityRaw, referringDomains, keywordCount, brandedPct,
    mentionCount, citationCount,
    aiVisibility.earned, aiPlatformScores,
  );

  const competitorReports = competitors?.filter(Boolean).map((comp) => {
    const crng = seededRng(domainSeed(comp));
    const ct = clamp(crng() * 15 + 8, 8, 23);
    const ca = clamp(crng() * 20 + 10, 10, 30);
    const cb = clamp(crng() * 12 + 4, 4, 16);
    const compName = brandName(comp);
    const compAiScores = mockPlatformScores(crng, compName, ind);
    const cai = compAiScores.reduce((s, p) => s + p.score, 0);
    return {
      domain: comp,
      totalScore: ct + ca + cb + cai,
      technical: ct,
      searchAuthority: ca,
      brandPresence: cb,
      aiVisibility: cai,
      aiPlatformScores: compAiScores,
    };
  });

  return {
    slug,
    domain,
    brandName: name,
    industry,
    competitors: competitors?.filter(Boolean),
    createdAt: new Date().toISOString(),
    totalScore,
    buckets: { technical, searchAuthority, brandPresence, aiVisibility },
    bucketSummaries,
    executiveSummary,
    insights,
    competitorReports,
  };
}
