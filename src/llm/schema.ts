import { z } from 'zod';

export const InnovationScoreSchema = z.object({
  dimension: z.literal('创新'),
  score: z.number().min(0).max(10),
  reason: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type InnovationScore = z.infer<typeof InnovationScoreSchema>;
