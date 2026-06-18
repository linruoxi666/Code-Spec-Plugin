import { z } from 'zod';

const BaseScoreSchema = z.object({
  score: z.number().min(0).max(10),
  reason: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const InnovationScoreSchema = BaseScoreSchema.extend({
  dimension: z.literal('创新'),
});

export const ArchitectureScoreSchema = BaseScoreSchema.extend({
  dimension: z.literal('架构'),
});

export const SecurityVulnerabilitySchema = z.object({
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  description: z.string(),
  file: z.string().optional(),
});

export const SecurityScoreSchema = BaseScoreSchema.extend({
  dimension: z.literal('安全'),
  vulnerabilities: z.array(SecurityVulnerabilitySchema).optional(),
});

export type InnovationScore = z.infer<typeof InnovationScoreSchema>;
export type ArchitectureScore = z.infer<typeof ArchitectureScoreSchema>;
export type SecurityScore = z.infer<typeof SecurityScoreSchema>;
