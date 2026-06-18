import type OpenAI from 'openai';
import { judgeInnovation } from './judge.js';
import type { InnovationScore } from './schema.js';
import type { SourceFile } from '../types/index.js';

export async function judgeInnovationWithConsensus(
  client: OpenAI,
  model: string,
  files: SourceFile[],
  runs: number = 3,
): Promise<InnovationScore> {
  const results: InnovationScore[] = [];
  for (let i = 0; i < runs; i++) {
    results.push(await judgeInnovation(client, model, files));
  }

  const scores = results.map((r) => r.score).sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)];
  const min = scores[0];
  const max = scores[scores.length - 1];

  const closest = results.reduce((best, current) =>
    Math.abs(current.score - median) < Math.abs(best.score - median) ? current : best,
  );

  if (max - min > 1.0) {
    return {
      ...closest,
      reason: `${closest.reason}（注：3 次评分差异较大 [${min}, ${max}]，建议人工复核）`,
    };
  }

  return closest;
}
