import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '../../src/rules/metric-calculator';
import type { RuleDefinition, SourceFile } from '../../src/types/index.js';

const commentRule: RuleDefinition = {
  id: 'comment-coverage',
  dimension: '注释',
  weight: 0.1,
  severity: 'warning',
  check: { type: 'metric', message: '注释覆盖率不足', threshold: 0.1 },
};

const fileRule: RuleDefinition = {
  id: 'file-length',
  dimension: '简洁',
  weight: 0.1,
  severity: 'warning',
  check: { type: 'metric', message: '文件过长', threshold: 10 },
};

const files: SourceFile[] = [
  { relativePath: 'a.ts', absolutePath: '/a.ts', content: '// comment\nconst a = 1;\n' },
  { relativePath: 'b.ts', absolutePath: '/b.ts', content: 'const b = 2;\n'.repeat(20) },
];

describe('calculateMetrics', () => {
  it('checks comment coverage', () => {
    const result = calculateMetrics(files, commentRule);
    expect(result.metrics[0].value).toBeGreaterThan(0);
  });

  it('detects long files', () => {
    const result = calculateMetrics(files, fileRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('b.ts');
  });

  it('detects long functions', () => {
    const functionRule: RuleDefinition = {
      id: 'function-length',
      dimension: '简洁',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: '函数过长', threshold: 5 },
    };
    const longFunction = 'function longFunc() {\n' + 'console.log(1);\n'.repeat(10) + '}';
    const functionFiles: SourceFile[] = [
      { relativePath: 'short.ts', absolutePath: '/short.ts', content: 'function a() { return 1; }' },
      { relativePath: 'long.ts', absolutePath: '/long.ts', content: longFunction },
    ];
    const result = calculateMetrics(functionFiles, functionRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('long.ts');
  });
});
