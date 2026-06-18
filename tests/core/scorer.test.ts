import { describe, it, expect } from 'vitest';
import { scoreDimensions, calculateTotalScore } from '../../src/core/scorer';
import type { Issue, MetricValue, RuleDefinition } from '../../src/types/index.js';

const rules: RuleDefinition[] = [
  { id: 'naming-convention', dimension: '规范', weight: 0.5, severity: 'error', check: { type: 'ast-query', message: '' } },
  { id: 'comment-coverage', dimension: '注释', weight: 1.0, severity: 'warning', check: { type: 'metric', message: '' } },
];

const issues: Issue[] = [
  { file: 'a.ts', rule: 'naming-convention', severity: 'error', message: 'bad name' },
  { file: 'b.ts', rule: 'comment-coverage', severity: 'warning', message: 'low coverage' },
];

const metrics: MetricValue[] = [{ name: 'commentCoverage', value: 0.05, unit: 'ratio' }];

describe('scoreDimensions', () => {
  it('calculates scores by dimension', () => {
    const results = scoreDimensions(rules, issues, metrics);
    const norm = results.find((r) => r.dimension === '规范');
    expect(norm!.score).toBeLessThan(10);
    expect(norm!.issues.length).toBe(1);
  });
});

describe('calculateTotalScore', () => {
  it('returns weighted total', () => {
    const dims = scoreDimensions(rules, issues, metrics);
    const total = calculateTotalScore(dims);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(10);
  });
});
