export interface SignalScore {
  name: string;
  earned: number;
  possible: number;
  source: string;
  rawValue?: string | number | boolean | null;
  note?: string;
}

export interface BucketScore {
  earned: number;
  possible: number;
  signals: SignalScore[];
}

export interface PerplexityProbe {
  prompt: string;
  earned: number;
  possible: number;
  mentioned: boolean;
  prominent: boolean;
  excerpt?: string;
}

export interface AiPlatformProbeResult {
  prompt: string;
  score: number;
  maxScore: number;
  snippet?: string;
}

export interface AiPlatformScore {
  platform: 'Perplexity' | 'ChatGPT' | 'Gemini' | 'Claude';
  score: number;
  maxScore: number;
  available: boolean;
  probeResults: AiPlatformProbeResult[];
}

export interface AiBucketScore extends BucketScore {
  probes: PerplexityProbe[];
  available: boolean;
  aiPlatformScores?: AiPlatformScore[];
  crossPlatformInsight?: string;
}

export interface InsightItem {
  title: string;
  detail: string;
}

export interface Insights {
  strengths: InsightItem[];
  gaps: InsightItem[];
  recommendations: InsightItem[];
}

export interface CompetitorSummary {
  domain: string;
  totalScore: number;
  technical: number;
  searchAuthority: number;
  brandPresence: number;
  aiVisibility: number;
  aiPlatformScores?: AiPlatformScore[];
}

export interface BucketSummaries {
  technical: string;
  authority: string;
  brand: string;
  aiVisibility: string;
}

export interface Report {
  slug: string;
  shareToken?: string;
  domain: string;
  brandName?: string;
  industry?: string;
  competitors?: string[];
  createdAt: string;
  totalScore: number;
  buckets: {
    technical: BucketScore;
    searchAuthority: BucketScore;
    brandPresence: BucketScore;
    aiVisibility: AiBucketScore;
  };
  bucketSummaries?: BucketSummaries;
  executiveSummary?: string | string[];
  insights: Insights;
  competitorReports?: CompetitorSummary[];
}
