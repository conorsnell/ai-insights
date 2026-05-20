export const PLATFORM_CONFIG = {
  Perplexity: { maxScore: 5, probeMaxes: [2, 2, 1] as const },
  ChatGPT:    { maxScore: 6, probeMaxes: [2, 2, 2] as const },
  Gemini:     { maxScore: 5, probeMaxes: [2, 2, 1] as const },
  Claude:     { maxScore: 4, probeMaxes: [2, 1, 1] as const },
} as const;

export type PlatformName = keyof typeof PLATFORM_CONFIG;

// Axis order for the radar chart
export const RADAR_AXIS_ORDER: PlatformName[] = ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'];
