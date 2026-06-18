import { describe, it, expect } from 'vitest';
import { evaluateProject } from '../../src/core/rule-engine';
import { resolve } from 'node:path';

const fixturePath = resolve(process.cwd(), 'tests/fixtures/sample-project');
const typescriptPack = resolve(process.cwd(), 'rule-packs/typescript');

describe('evaluateProject', () => {
  it('detects naming and comment issues in sample project', async () => {
    const report = await evaluateProject({
      projectPath: fixturePath,
      rulePackPaths: [typescriptPack],
    });
    const namingIssues = report.issues.filter((i) => i.rule === 'naming-convention');
    expect(namingIssues.length).toBeGreaterThan(0);
    expect(report.totalScore).toBeGreaterThan(0);
    expect(report.totalScore).toBeLessThan(10);
    expect(report.dimensions.length).toBe(4);
  });
});
