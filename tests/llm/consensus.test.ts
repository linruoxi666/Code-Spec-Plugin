import { describe, it, expect, vi } from 'vitest';
import { judgeInnovationWithConsensus } from '../../src/llm/consensus';
import type { SourceFile } from '../../src/types/index.js';

const files: SourceFile[] = [
  { relativePath: 'a.ts', absolutePath: '/a.ts', content: 'export const a = 1;' },
];

function createMockClient(scores: number[]) {
  let index = 0;
  return {
    chat: {
      completions: {
        create: vi.fn(() => {
          const score = scores[index++];
          return Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    dimension: '创新',
                    score,
                    reason: 'test',
                    strengths: [],
                    weaknesses: [],
                    suggestions: [],
                  }),
                },
              },
            ],
          });
        }),
      },
    },
  } as unknown as any;
}

describe('judgeInnovationWithConsensus', () => {
  it('returns median score', async () => {
    const client = createMockClient([7, 8, 9]);
    const result = await judgeInnovationWithConsensus(client, 'model', files, 3);
    expect(result.score).toBe(8);
  });

  it('flags high variance', async () => {
    const client = createMockClient([3, 8, 9]);
    const result = await judgeInnovationWithConsensus(client, 'model', files, 3);
    expect(result.reason).toContain('差异较大');
  });
});
