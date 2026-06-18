import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../src/guidelines/prompt-builder';
import type { RuleDefinition } from '../../src/types/index.js';

const rules: RuleDefinition[] = [
  { id: 'naming-convention', dimension: '规范', weight: 0.1, severity: 'error', check: { type: 'ast-query', message: '函数名使用 camelCase' } },
];

describe('buildSystemPrompt', () => {
  it('includes tech stack and rules', () => {
    const prompt = buildSystemPrompt({
      techStack: { languages: ['TypeScript'], frameworks: ['React'] },
      rules,
      freshnessWarnings: [],
    });
    expect(prompt).toContain('TypeScript');
    expect(prompt).toContain('camelCase');
  });
});
