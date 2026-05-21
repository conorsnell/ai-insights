import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiPlatformScore, AiPlatformProbeResult, AiBucketScore, PerplexityProbe } from './types';
import { PLATFORM_CONFIG } from './platform-config';

// Template fallback: Q1 branded, Q2 category, Q3 solution — mirrors the Claude-generated structure.
function buildFallbackPrompts(brand: string, industry: string, categoryKeywords?: string[]): string[] {
  if (categoryKeywords && categoryKeywords.length >= 2) {
    return [
      `What does ${brand} do and who do they work with?`,
      `Who are the leading ${categoryKeywords[0]} companies?`,
      `What do experts recommend for ${categoryKeywords[1]}?`,
    ];
  }
  return [
    `What does ${brand} do and who do they work with?`,
    `Who are the top ${industry} companies?`,
    `What do experts recommend for ${industry} solutions?`,
  ];
}

// Generate 3 probe questions via Claude covering three stages of the buyer journey:
//   Q1 — branded: tests whether AI platforms have accurate info about the brand
//   Q2 — category: tests shortlisting visibility (no brand name)
//   Q3 — solution: tests validation-stage visibility (no brand name)
// Falls back to template prompts on any failure.
async function generateProbeQuestions(
  brand: string,
  industry: string,
  categoryKeywords?: string[],
): Promise<string[]> {
  const fallback = buildFallbackPrompts(brand, industry, categoryKeywords);
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are generating search queries that a B2B buyer would use when researching vendors. Generate exactly 3 questions in this order: (1) a natural branded query asking what the brand does or who they serve, (2) a category-level query a buyer uses when shortlisting vendors without knowing the brand yet, (3) a solution-level query a buyer uses when validating options. Questions 2 and 3 must NOT include the brand name. All questions must be grammatically natural. Return ONLY a valid JSON array of 3 strings, nothing else.`,
      messages: [{
        role: 'user',
        content: `Brand: ${brand}\nIndustry: ${industry}\nCategory keywords: ${(categoryKeywords ?? []).join(', ')}`,
      }],
    });
    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every((q): q is string => typeof q === 'string' && q.length > 0)
    ) {
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

const NEGATIVE_PHRASES = [
  "i don't have information about",
  "i don't have specific information",
  "i couldn't find information",
  "no information about",
  "not familiar with",
  "i'm not aware of",
  "doesn't appear in my",
  "no results for",
  "i cannot find",
  "i have no information",
  "don't have any information",
  "unable to find information",
  "not in my knowledge",
  "i lack information",
];

function scoreProbe(
  response: string,
  brand: string,
  probeMax: number,
): { score: number; snippet: string; brandMentioned: boolean; negativeResponse: boolean } {
  const normalized = response.toLowerCase();
  const brandLower = brand.toLowerCase();

  // Negative response: platform explicitly signals it doesn't know the brand
  if (NEGATIVE_PHRASES.some(phrase => normalized.includes(phrase))) {
    return { score: 0, snippet: '', brandMentioned: false, negativeResponse: true };
  }

  // Hard requirement: brand must appear in the response for any points
  if (!normalized.includes(brandLower)) return { score: 0, snippet: '', brandMentioned: false, negativeResponse: false };

  const halfIndex = Math.floor(normalized.length / 2);
  const prominent = normalized.slice(0, halfIndex).includes(brandLower);
  const score = prominent ? probeMax : Math.floor(probeMax / 2);

  const idx = normalized.indexOf(brandLower);
  const start = Math.max(0, idx - 60);
  const end = Math.min(response.length, idx + 120);
  const snippet = response.slice(start, end).replace(/\s+/g, ' ').trim();

  return { score, snippet, brandMentioned: true, negativeResponse: false };
}

function unavailable(
  platform: AiPlatformScore['platform'],
  prompts: string[],
): AiPlatformScore {
  const config = PLATFORM_CONFIG[platform];
  return {
    platform,
    score: 0,
    maxScore: config.maxScore,
    available: false,
    probeResults: prompts.map((prompt, i) => ({
      prompt,
      score: 0,
      maxScore: config.probeMaxes[i],
      brandMentioned: false,
      negativeResponse: false,
    })),
  };
}

async function probePerplexity(brand: string, prompts: string[]): Promise<AiPlatformScore> {
  try {
    const probeResults: AiPlatformProbeResult[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: prompts[i] }],
          max_tokens: 400,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}`);
      const data = await res.json();
      const text: string = data.choices?.[0]?.message?.content ?? '';
      const config = PLATFORM_CONFIG.Perplexity;
      const { score, snippet, brandMentioned, negativeResponse } = scoreProbe(text, brand, config.probeMaxes[i]);
      probeResults.push({ prompt: prompts[i], score, maxScore: config.probeMaxes[i], snippet: snippet || undefined, brandMentioned, negativeResponse });
    }
    return {
      platform: 'Perplexity',
      score: probeResults.reduce((s, p) => s + p.score, 0),
      maxScore: PLATFORM_CONFIG.Perplexity.maxScore,
      available: true,
      probeResults,
    };
  } catch {
    return unavailable('Perplexity', prompts);
  }
}

async function probeChatGPT(brand: string, prompts: string[]): Promise<AiPlatformScore> {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const probeResults: AiPlatformProbeResult[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompts[i] }],
        max_tokens: 400,
      });
      const text = completion.choices[0]?.message?.content ?? '';
      const config = PLATFORM_CONFIG.ChatGPT;
      const { score, snippet, brandMentioned, negativeResponse } = scoreProbe(text, brand, config.probeMaxes[i]);
      probeResults.push({ prompt: prompts[i], score, maxScore: config.probeMaxes[i], snippet: snippet || undefined, brandMentioned, negativeResponse });
    }
    return {
      platform: 'ChatGPT',
      score: probeResults.reduce((s, p) => s + p.score, 0),
      maxScore: PLATFORM_CONFIG.ChatGPT.maxScore,
      available: true,
      probeResults,
    };
  } catch {
    return unavailable('ChatGPT', prompts);
  }
}

async function probeGemini(brand: string, prompts: string[]): Promise<AiPlatformScore> {
  // NOTE: The Generative Language API must be enabled in Google Cloud Console:
  // APIs & Services > Library > search "Generative Language API" > Enable
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const probeResults: AiPlatformProbeResult[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const result = await model.generateContent(prompts[i]);
      const text = result.response.text();
      const config = PLATFORM_CONFIG.Gemini;
      const { score, snippet, brandMentioned, negativeResponse } = scoreProbe(text, brand, config.probeMaxes[i]);
      probeResults.push({ prompt: prompts[i], score, maxScore: config.probeMaxes[i], snippet: snippet || undefined, brandMentioned, negativeResponse });
    }
    return {
      platform: 'Gemini',
      score: probeResults.reduce((s, p) => s + p.score, 0),
      maxScore: PLATFORM_CONFIG.Gemini.maxScore,
      available: true,
      probeResults,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[AI Probes] Gemini probe failed:', msg);
    return unavailable('Gemini', prompts);
  }
}

async function probeClaude(brand: string, prompts: string[]): Promise<AiPlatformScore> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const probeResults: AiPlatformProbeResult[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompts[i] }],
      });
      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const config = PLATFORM_CONFIG.Claude;
      const { score, snippet, brandMentioned, negativeResponse } = scoreProbe(text, brand, config.probeMaxes[i]);
      probeResults.push({ prompt: prompts[i], score, maxScore: config.probeMaxes[i], snippet: snippet || undefined, brandMentioned, negativeResponse });
    }
    return {
      platform: 'Claude',
      score: probeResults.reduce((s, p) => s + p.score, 0),
      maxScore: PLATFORM_CONFIG.Claude.maxScore,
      available: true,
      probeResults,
    };
  } catch {
    return unavailable('Claude', prompts);
  }
}

export async function runAiPlatformProbes(
  brand: string,
  industry: string,
  categoryKeywords?: string[],
): Promise<AiPlatformScore[]> {
  // Generate probe questions once via Claude; all four platforms receive the same prompts.
  const prompts = await generateProbeQuestions(brand, industry, categoryKeywords);
  const [perplexity, chatgpt, gemini, claude] = await Promise.all([
    probePerplexity(brand, prompts),
    probeChatGPT(brand, prompts),
    probeGemini(brand, prompts),
    probeClaude(brand, prompts),
  ]);
  return [perplexity, chatgpt, gemini, claude];
}

export async function generateCrossPlatformInsight(
  brand: string,
  scores: AiPlatformScore[],
): Promise<string> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const scoresSummary = scores
      .map(s => `${s.platform}: ${s.score}/${s.maxScore} pts${!s.available ? ' (unavailable)' : ''}`)
      .join(', ');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `In one concise sentence, synthesize what the variance in AI platform visibility scores means for the brand "${brand}". Scores: ${scoresSummary}. Be specific about which platforms show strength vs weakness and what this implies about the brand's web presence. Do not start with "I" and avoid generic filler.`,
      }],
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
    return text || fallbackInsight(brand, scores);
  } catch {
    return fallbackInsight(brand, scores);
  }
}

function fallbackInsight(brand: string, scores: AiPlatformScore[]): string {
  const available = scores.filter(s => s.available);
  if (!available.length) return `${brand}'s AI platform visibility could not be determined due to API unavailability.`;

  const sorted = [...available].sort((a, b) => (b.score / b.maxScore) - (a.score / a.maxScore));
  const top = sorted.slice(0, Math.ceil(sorted.length / 2)).map(s => s.platform);
  const bottom = sorted.slice(Math.ceil(sorted.length / 2)).map(s => s.platform);

  if (!bottom.length) return `${brand} shows consistent AI visibility across all platforms tested.`;

  const topStr = top.length === 1 ? top[0] : `${top.slice(0, -1).join(', ')} and ${top[top.length - 1]}`;
  const bottomStr = bottom.length === 1 ? bottom[0] : `${bottom.slice(0, -1).join(', ')} and ${bottom[bottom.length - 1]}`;

  return `${brand} shows stronger AI presence on ${topStr} than on ${bottomStr}, suggesting uneven citation distribution across AI retrieval ecosystems.`;
}

export function buildAiVisibilityBucket(
  platformScores: AiPlatformScore[],
  crossPlatformInsight: string,
): AiBucketScore {
  const totalEarned = platformScores.reduce((s, p) => s + p.score, 0);
  const availableCount = platformScores.filter(p => p.available).length;

  // Keep legacy probes populated from Perplexity for backward compat
  const perp = platformScores.find(p => p.platform === 'Perplexity');
  const legacyProbes: PerplexityProbe[] = (perp?.probeResults ?? []).map(pr => ({
    prompt: pr.prompt,
    earned: pr.score,
    possible: pr.maxScore,
    mentioned: pr.score > 0,
    prominent: pr.score === pr.maxScore && pr.maxScore > 0,
    excerpt: pr.snippet,
  }));

  return {
    earned: totalEarned,
    possible: 20,
    available: availableCount > 0,
    probes: legacyProbes,
    aiPlatformScores: platformScores,
    crossPlatformInsight,
    signals: platformScores.map(p => ({
      name: `${p.platform} AI visibility`,
      earned: p.score,
      possible: p.maxScore,
      source: p.platform === 'ChatGPT' ? 'OpenAI API' : p.platform === 'Gemini' ? 'Google AI API' : p.platform === 'Claude' ? 'Anthropic API' : 'Perplexity API',
      rawValue: !p.available ? 'Unavailable' : `${p.score}/${p.maxScore} pts`,
    })),
  };
}
