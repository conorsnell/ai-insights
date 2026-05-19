# AI Insights — Project Blueprint

## What We're Building

A web application called **AI Insights** that analyzes any domain and returns a proprietary AI visibility score (0–100), bucket-level breakdowns, and Claude-generated written insights. Built for an internal B2B marketing agency team to use in sales conversations. Reports are saved and shareable via unique URLs.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Deployment**: Vercel (existing account)
- **Persistence**: Vercel KV (Redis) for report storage and shareable links
- **Styling**: Tailwind CSS
- **PDF export**: Browser print-to-PDF (no server-side PDF generation)

---

## API Integrations

All API keys are stored as environment variables. Never expose them client-side. All external API calls happen in Next.js API routes (server-side only).

| Service | Env Variable | Purpose |
|---|---|---|
| SEMRush | `SEMRUSH_API_KEY` | Authority, backlinks, keywords, mentions |
| Google PageSpeed Insights | `PAGESPEED_API_KEY` | Core Web Vitals, page experience |
| Perplexity | `PERPLEXITY_API_KEY` | AI platform visibility (brand mention probe) |
| Anthropic | `ANTHROPIC_API_KEY` | Written insights generation |

---

## Scoring Model

Final score is **X/100** rolled up from four weighted buckets.

### Bucket 1: Technical Foundation (25 pts)

Signals and their max point values:

| Signal | Source | Max Pts |
|---|---|---|
| Sitemap present and valid | Fetch `/sitemap.xml` | 4 |
| Schema markup present (any type) | Fetch + parse HTML | 5 |
| FAQ schema or FAQ HTML section present | Fetch + parse HTML | 4 |
| Core Web Vitals pass (LCP, CLS, FID) | PageSpeed Insights API | 7 |
| Mobile usability score | PageSpeed Insights API | 5 |

### Bucket 2: Search Authority (35 pts)

| Signal | Source | Max Pts |
|---|---|---|
| Authority Score (0–100 normalized) | SEMRush Domain Overview | 10 |
| Referring domains count (normalized) | SEMRush Backlinks | 8 |
| Backlink toxicity / spam score (inverse) | SEMRush Backlinks | 5 |
| Topical keyword coverage breadth | SEMRush Organic Research | 7 |
| Branded vs non-branded keyword mix | SEMRush Organic Research | 5 |

### Bucket 3: Brand Presence (20 pts)

| Signal | Source | Max Pts |
|---|---|---|
| Brand mention velocity | SEMRush Brand Monitoring | 10 |
| Off-platform citation count | SEMRush Backlinks (non-competitor referring domains) | 10 |

### Bucket 4: AI Visibility — Estimated (20 pts)

**Label this bucket clearly as "Estimated" in the UI.** Include a tooltip explaining methodology.

| Signal | Source | Max Pts |
|---|---|---|
| Brand appears in Perplexity response to "What is [brand]?" | Perplexity API | 6 |
| Brand appears in Perplexity response to "Who are the top [industry] companies?" | Perplexity API | 7 |
| Brand appears in Perplexity response to "What do people say about [brand]?" | Perplexity API | 7 |

For each Perplexity probe: 
- Full points = brand mentioned prominently (first half of response)
- Half points = brand mentioned but not prominently
- Zero = brand not mentioned

Industry for prompts is inferred from SEMRush category data or optionally provided by user.

---

## User Input

```
Domain (required):          [ example.com              ]
Industry (optional):        [ SaaS / Healthcare / etc. ]
Competitor 1 (optional):    [ competitor.com            ]
Competitor 2 (optional):    [ competitor.com            ]
Competitor 3 (optional):    [ competitor.com            ]
```

- Strip protocol and trailing slash from domain input automatically
- Industry field is a free-text input (not a dropdown) — used to improve Perplexity prompts
- If industry is blank, infer from SEMRush category data
- Competitor scores run the same full scoring pipeline on each competitor domain

---

## Report Output

Each report page (`/report/[slug]`) displays:

1. **Header**: Domain name, score (large, visual), date generated
2. **Bucket Breakdown**: Four score cards showing pts earned / pts possible per bucket
3. **AI Visibility Callout**: Estimated badge, methodology tooltip, Perplexity probe results listed
4. **Claude-Generated Insights**: Three sections:
   - Top 3 Strengths (what the domain does well)
   - Top 3 Gaps / Opportunities (what's holding the score down)
   - Strategic Recommendations (actionable for a sales conversation)
5. **Competitive Snapshot** (if competitors provided): Side-by-side score comparison table
6. **Raw Signal Data**: Collapsible section showing all underlying signal values

---

## Claude API — Insights Generation

Call `claude-sonnet-4-20250514` with the full report data as context.

System prompt:
```
You are an expert B2B digital marketing strategist. You are analyzing AI visibility and SEO signals for a domain. Your output will be used in a sales conversation by a demand generation agency. Be direct, specific, and actionable. Do not use generic filler language. Reference actual signal data in your insights.
```

User prompt should include: domain, all raw signal values, all bucket scores, industry (if known), and competitor scores (if available).

Request structured JSON output with keys: `strengths` (array of 3), `gaps` (array of 3), `recommendations` (array of 3). Each item is an object with `title` and `detail`.

---

## Data Persistence + Shareable Links

- When a report completes, serialize the full report data as JSON
- Generate a slug: `[domain-slug]-[6-char-random-id]` (e.g., `sonobello-a3f9x`)
- Store in Vercel KV with key `report:[slug]`
- No TTL — reports persist indefinitely
- Report URL pattern: `/report/[slug]`
- On report completion, display the shareable URL prominently with a copy button
- `/report/[slug]` fetches from KV and renders the report server-side

---

## App Routes

```
/                        — Home: domain input form
/api/analyze             — POST: runs full analysis pipeline, saves to KV, returns slug
/api/report/[slug]       — GET: fetches report JSON from KV
/report/[slug]           — Report display page (shareable)
```

---

## UI / UX Requirements

- Ungated — no auth, no password, fully public
- Loading state on `/` while analysis runs: show progress indicators per pipeline stage (Technical, Authority, Brand Presence, AI Visibility)
- Report page must look polished and professional — this is shown to prospective clients
- Include a "Share" button that copies the URL to clipboard
- Include a "Print / Save as PDF" button that triggers browser print
- Mobile-responsive
- demandDrive branding in the header (text logo is fine, no image assets required)

---

## Error Handling

- If SEMRush returns no data for a domain (new/unknown domain), show partial score with a clear note on which signals could not be calculated
- If Perplexity API fails, AI Visibility bucket shows 0 with an "unavailable" label — do not fail the full report
- If PageSpeed API fails, Technical Foundation shows partial score with a note
- Never show a blank or broken report — always render what data is available

---

## Environment Variables Required

```
SEMRUSH_API_KEY=
PAGESPEED_API_KEY=
PERPLEXITY_API_KEY=
ANTHROPIC_API_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

Note: `KV_REST_API_URL` and `KV_REST_API_TOKEN` are provided automatically when you connect a Vercel KV database in the Vercel dashboard. Set the others manually in Vercel environment settings.

---

## Build Order (follow this sequence)

1. Scaffold Next.js app with Tailwind
2. Set up Vercel KV client
3. Build `/api/analyze` route with stubbed signal functions (return mock data first)
4. Build report page UI (`/report/[slug]`) using mock data
5. Wire in SEMRush API calls one at a time
6. Wire in PageSpeed Insights API
7. Wire in Perplexity AI visibility probes
8. Wire in Anthropic insights generation
9. Replace all stubs with live data
10. Connect Vercel KV persistence + slug generation
11. Polish UI, loading states, error states
12. Deploy to Vercel

---

## Out of Scope (Phase 2)

- Clay integration for contact/company enrichment
- Google Search Console integration
- Keyword-driven Perplexity prompts (currently uses generic brand prompts)
- Report history / dashboard
- User accounts or saved domains
- Automated re-scoring / staleness detection
