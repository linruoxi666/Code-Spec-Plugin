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

  if (rule.id === 'react-component-length') {
    const issues: Issue[] = [];
    const threshold = rule.check.threshold ?? 250;
    for (const file of files) {
      if (!file.relativePath.endsWith('.tsx')) continue;
      const lines = file.content.split('\n').length;
      if (lines > threshold) {
        issues.push({
          file: file.relativePath,
          rule: rule.id,
          severity: rule.severity,
          message: `React 组件文件 ${lines} 行，超过 ${threshold} 行限制`,
        });
      }
    }
    return { issues, metrics: [] };
  }

  if (rule.id === 'function-length') {
    const issues: Issue[] = [];
    const threshold = rule.check.threshold ?? 50;
    for (const file of files) {
      if (!file.relativePath.endsWith('.ts') && !file.relativePath.endsWith('.tsx')) continue;
      const functionMatches = file.content.match(/(?:function\s+\w+|\)\s*=>)\s*[^{]*\{/g) ?? [];
      for (const match of functionMatches) {
        const startIndex = file.content.indexOf(match);
        if (startIndex === -1) continue;
        const openBraceIndex = startIndex + match.length - 1;
        let braceCount = 1;
        let endIndex = openBraceIndex;
        for (let i = openBraceIndex + 1; i < file.content.length; i++) {
          if (file.content[i] === '{') braceCount++;
          if (file.content[i] === '}') braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
        const body = file.content.slice(startIndex, endIndex + 1);
        const lines = body.split('\n').length;
        if (lines > threshold) {
          const lineNumber = file.content.slice(0, startIndex).split('\n').length;
          issues.push({
            file: file.relativePath,
            rule: rule.id,
            line: lineNumber,
            severity: rule.severity,
            message: `函数约 ${lines} 行，超过 ${threshold} 行限制`,
          });
        }
      }
    }
    return { issues, metrics: [] };
  }

  return { issues: [], metrics: [] };
}
