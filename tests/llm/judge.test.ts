import { describe, it, expect, vi } from 'vitest';
import { judgeInnovation, judgeArchitecture, judgeSecurity } from '../../src/llm/judge';
import type { SourceFile } from '../../src/types/index.js';

const files: SourceFile[] = [
  {
    relativePath: 'src/index.ts',
    absolutePath: '/src/index.ts',
    content: 'export function main() { return "hello"; }',
  },
];

function createMockClient(dimension: string, extra?: Record<string, unknown>) {
  return {
    chat: {
      completions: {
        create: vi.fn(() =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    dimension,
                    score: 7.5,
                    reason: 'test',
                    strengths: ['结构清晰'],
                    weaknesses: ['缺少深度'],
                    suggestions: ['增加抽象'],
                    ...extra,
                  }),
                },
              },
            ],
          }),
        ),
      },
    },
  } as unknown as any;
}

describe('judgeInnovation', () => {
  it('parses LLM response into structured score', async () => {
    const client = createMockClient('创新');
    const result = await judgeInnovation(client, 'gpt-4o-mini', files);
    expect(result.score).toBe(7.5);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.dimension).toBe('创新');
  });
});

describe('judgeArchitecture', () => {
  it('parses architecture dimension score', async () => {
    const client = createMockClient('架构');
    const result = await judgeArchitecture(client, 'gpt-4o-mini', files);
    expect(result.score).toBe(7.5);
    expect(result.dimension).toBe('架构');
  });
});

describe('judgeSecurity', () => {
  it('parses security dimension score with vulnerabilities', async () => {
    const client = createMockClient('安全', {
      vulnerabilities: [{ severity: 'HIGH', description: 'hardcoded key', file: 'src/api.ts' }],
    });
    const result = await judgeSecurity(client, 'gpt-4o-mini', files);
    expect(result.score).toBe(7.5);
    expect(result.dimension).toBe('安全');
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities?.[0].severity).toBe('HIGH');
  });
});
