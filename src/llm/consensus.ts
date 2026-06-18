import type OpenAI from 'openai';
import { judgeInnovation, judgeArchitecture, judgeSecurity } from './judge.js';
import type { InnovationScore, ArchitectureScore, SecurityScore } from './schema.js';
import type { SourceFile } from '../types/index.js';

interface ScoredResult {
  score: number;
  reason: string;
}

async function runWithConsensus<T extends ScoredResult>(
  runner: () => Promise<T>,
  runs: number,
): Promise<T> {
  const results: T[] = [];
  for (let i = 0; i < runs; i++) {
    results.push(await runner());
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
      reason: `${closest.reason}（注：${runs} 次评分差异较大 [${min}, ${max}]，建议人工复核）`,
    };
  }

  return closest;
}

export async function judgeInnovationWithConsensus(
  client: OpenAI,
  model: string,
  files: SourceFile[],
  runs: number = 3,
): Promise<InnovationScore> {
  return runWithConsensus(() => judgeInnovation(client, model, files), runs);
}

export async function judgeArchitectureWithConsensus(
  client: OpenAI,
  model: string,
  files: SourceFile[],
  runs: number = 3,
): Promise<ArchitectureScore> {
  return runWithConsensus(() => judgeArchitecture(client, model, files), runs);
}

export async function judgeSecurityWithConsensus(
  client: OpenAI,
  model: string,
  files: SourceFile[],
  runs: number = 3,
): Promise<SecurityScore> {
  return runWithConsensus(() => judgeSecurity(client, model, files), runs);
}
