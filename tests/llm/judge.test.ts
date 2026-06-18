import { describe, it, expect, vi } from 'vitest';
import { judgeInnovation } from '../../src/llm/judge';
import type { SourceFile } from '../../src/types/index.js';

const mockClient = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
} as unknown as any;

const files: SourceFile[] = [
  {
    relativePath: 'src/index.ts',
    absolutePath: '/src/index.ts',
    content: 'export function main() { return "hello"; }',
  },
];

describe('judgeInnovation', () => {
  it('parses LLM response into structured score', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              dimension: '创新',
              score: 7.5,
              reason: '常规实现',
              strengths: ['结构清晰'],
              weaknesses: ['缺少原创性'],
              suggestions: ['增加自定义抽象'],
            }),
          },
        },
      ],
    });

    const result = await judgeInnovation(mockClient, 'gpt-4o-mini', files);
    expect(result.score).toBe(7.5);
    expect(result.strengths.length).toBeGreaterThan(0);
  });
});
