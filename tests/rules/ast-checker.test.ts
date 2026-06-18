import { describe, it, expect } from 'vitest';
import { checkAst } from '../../src/rules/ast-checker';
import type { RuleDefinition, SourceFile } from '../../src/types/index.js';

const rule: RuleDefinition = {
  id: 'naming-convention',
  dimension: '规范',
  weight: 0.15,
  severity: 'error',
  check: {
    type: 'ast-query',
    message: '函数名应使用 camelCase',
  },
};

const files: SourceFile[] = [
  {
    relativePath: 'good.ts',
    absolutePath: '/good.ts',
    content: 'export function addOne(x: number): number { return x + 1; }',
  },
  {
    relativePath: 'bad.ts',
    absolutePath: '/bad.ts',
    content: 'export function BAD_FUNCTION(x: any, y: any) { return x + y; }',
  },
];

describe('checkAst', () => {
  it('detects non-camelCase function names', () => {
    const issues = checkAst(files, rule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.ts');
    expect(issues[0].message).toContain('BAD_FUNCTION');
  });
});
