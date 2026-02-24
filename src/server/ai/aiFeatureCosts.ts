export const AI_FEATURE_COSTS = {
  VIDEO_ANALYSIS: 3,
  VIRAL_PATTERNS: 10,
  TITLE_THUMBNAIL: 5,
  RETENTION_PROBABILITY: 6,
  RETENTION_AUDIT: 6,
  PATTERN_BLENDING: 10,
  EXPECTED_VALUE: 8,
  CTR_PROBABILITY: 6,
  CTR_COMPARISON: 5,
  CTR_AUDIT: 6,
  CREATOR_INTELLIGENCE: 10,
  COMPARE: 3,
  AI_ANALYSIS: 8,
} as const;

export type AIFeature = keyof typeof AI_FEATURE_COSTS;

export function getAICost(feature: AIFeature): number {
  return AI_FEATURE_COSTS[feature] ?? 0;
}

export function getAllAICosts(): Record<AIFeature, number> {
  return { ...AI_FEATURE_COSTS };
}
