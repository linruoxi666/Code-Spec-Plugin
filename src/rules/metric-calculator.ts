import type { Issue, MetricValue, RuleDefinition, SourceFile } from '../types/index.js';

export function calculateMetrics(files: SourceFile[], rule: RuleDefinition): { issues: Issue[]; metrics: MetricValue[] } {
  if (rule.check.type !== 'metric') return { issues: [], metrics: [] };

  if (rule.id === 'comment-coverage') {
    const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const commentLines = files.reduce((sum, f) => {
      const matches = f.content.match(/(\/\/.*|\/\*[\s\S]*?\*\/)/g);
      return sum + (matches ? matches.length : 0);
    }, 0);
    const coverage = totalLines === 0 ? 0 : commentLines / totalLines;
    const threshold = rule.check.threshold ?? 0.1;
    const issues: Issue[] = [];
    if (coverage < threshold) {
      issues.push({
        file: 'project',
        rule: rule.id,
        severity: rule.severity,
        message: `注释覆盖率 ${(coverage * 100).toFixed(1)}% 低于阈值 ${(threshold * 100).toFixed(0)}%`,
      });
    }
    return {
      issues,
      metrics: [{ name: 'commentCoverage', value: coverage, unit: 'ratio' }],
    };
  }

  if (rule.id === 'file-length') {
    const issues: Issue[] = [];
    const threshold = rule.check.threshold ?? 300;
    for (const file of files) {
      const lines = file.content.split('\n').length;
      if (lines > threshold) {
        issues.push({
          file: file.relativePath,
          rule: rule.id,
          severity: rule.severity,
          message: `文件 ${lines} 行，超过 ${threshold} 行限制`,
        });
      }
    }
    return { issues, metrics: [] };
  }

  return { issues: [], metrics: [] };
}
