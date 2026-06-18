import type { Issue, MetricValue, RuleDefinition, SourceFile } from '../types/index.js';

function measureBlockLength(file: SourceFile, match: string, threshold: number): { file: string; line: number; lines: number } | null {
  const startIndex = file.content.indexOf(match);
  if (startIndex === -1) return null;
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
  if (lines <= threshold) return null;
  const lineNumber = file.content.slice(0, startIndex).split('\n').length;
  return { file: file.relativePath, line: lineNumber, lines };
}

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

  if (rule.id === 'javadoc-coverage') {
    const javaFiles = files.filter((f) => f.relativePath.endsWith('.java'));
    const totalLines = javaFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const javadocLines = javaFiles.reduce((sum, f) => {
      const matches = f.content.match(/\/\*\*[\s\S]*?\*\//g);
      return sum + (matches ? matches.length : 0);
    }, 0);
    const coverage = totalLines === 0 ? 0 : javadocLines / totalLines;
    const threshold = rule.check.threshold ?? 0.1;
    const issues: Issue[] = [];
    if (coverage < threshold) {
      issues.push({
        file: 'project',
        rule: rule.id,
        severity: rule.severity,
        message: `Javadoc 覆盖率 ${(coverage * 100).toFixed(1)}% 低于阈值 ${(threshold * 100).toFixed(0)}%`,
      });
    }
    return {
      issues,
      metrics: [{ name: 'javadocCoverage', value: coverage, unit: 'ratio' }],
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

  if (rule.id === 'kdoc-coverage') {
    const kotlinFiles = files.filter((f) => f.relativePath.endsWith('.kt'));
    const totalLines = kotlinFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const kdocLines = kotlinFiles.reduce((sum, f) => {
      const matches = f.content.match(/\/\*\*[\s\S]*?\*\//g);
      return sum + (matches ? matches.length : 0);
    }, 0);
    const coverage = totalLines === 0 ? 0 : kdocLines / totalLines;
    const threshold = rule.check.threshold ?? 0.1;
    const issues: Issue[] = [];
    if (coverage < threshold) {
      issues.push({
        file: 'project',
        rule: rule.id,
        severity: rule.severity,
        message: `KDoc 覆盖率 ${(coverage * 100).toFixed(1)}% 低于阈值 ${(threshold * 100).toFixed(0)}%`,
      });
    }
    return {
      issues,
      metrics: [{ name: 'kdocCoverage', value: coverage, unit: 'ratio' }],
    };
  }

  if (rule.id === 'rust-doc-coverage') {
    const rustFiles = files.filter((f) => f.relativePath.endsWith('.rs'));
    const totalLines = rustFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const docLines = rustFiles.reduce((sum, f) => {
      const matches = f.content.match(/\/\/\/[^\n]*/g);
      return sum + (matches ? matches.length : 0);
    }, 0);
    const coverage = totalLines === 0 ? 0 : docLines / totalLines;
    const threshold = rule.check.threshold ?? 0.1;
    const issues: Issue[] = [];
    if (coverage < threshold) {
      issues.push({
        file: 'project',
        rule: rule.id,
        severity: rule.severity,
        message: `Rust 文档注释覆盖率 ${(coverage * 100).toFixed(1)}% 低于阈值 ${(threshold * 100).toFixed(0)}%`,
      });
    }
    return {
      issues,
      metrics: [{ name: 'rustDocCoverage', value: coverage, unit: 'ratio' }],
    };
  }

  if (rule.id === 'python-doc-coverage') {
    const pythonFiles = files.filter((f) => f.relativePath.endsWith('.py'));
    const totalLines = pythonFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const docLines = pythonFiles.reduce((sum, f) => {
      const matches = f.content.match(/"""[\s\S]*?"""/g);
      return sum + (matches ? matches.length : 0);
    }, 0);
    const coverage = totalLines === 0 ? 0 : docLines / totalLines;
    const threshold = rule.check.threshold ?? 0.1;
    const issues: Issue[] = [];
    if (coverage < threshold) {
      issues.push({
        file: 'project',
        rule: rule.id,
        severity: rule.severity,
        message: `Python 文档字符串覆盖率 ${(coverage * 100).toFixed(1)}% 低于阈值 ${(threshold * 100).toFixed(0)}%`,
      });
    }
    return {
      issues,
      metrics: [{ name: 'pythonDocCoverage', value: coverage, unit: 'ratio' }],
    };
  }

  if (rule.id === 'function-length') {
    const issues: Issue[] = [];
    const threshold = rule.check.threshold ?? 50;
    for (const file of files) {
      if (file.relativePath.endsWith('.ts') || file.relativePath.endsWith('.tsx')) {
        const functionMatches = file.content.match(/(?:function\s+\w+|\)\s*=>)\s*[^{]*\{/g) ?? [];
        for (const match of functionMatches) {
          const result = measureBlockLength(file, match, threshold);
          if (result) issues.push({ ...result, rule: rule.id, severity: rule.severity, message: `函数约 ${result.lines} 行，超过 ${threshold} 行限制` });
        }
      }
      if (file.relativePath.endsWith('.java')) {
        const methodMatches = file.content.match(/(?:public|protected|private|static|\s)+[\w<>\[\]]+\s+\w+\s*\([^)]*\)\s*\{/g) ?? [];
        for (const match of methodMatches) {
          const result = measureBlockLength(file, match, threshold);
          if (result) issues.push({ ...result, rule: rule.id, severity: rule.severity, message: `方法约 ${result.lines} 行，超过 ${threshold} 行限制` });
        }
      }
      if (file.relativePath.endsWith('.kt')) {
        const functionMatches = file.content.match(/fun\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\{/g) ?? [];
        for (const match of functionMatches) {
          const result = measureBlockLength(file, match, threshold);
          if (result) issues.push({ ...result, rule: rule.id, severity: rule.severity, message: `函数约 ${result.lines} 行，超过 ${threshold} 行限制` });
        }
      }
      if (file.relativePath.endsWith('.go')) {
        const functionMatches = file.content.match(/func\s+(?:\([^)]*\)\s*)?\w+\s*\([^)]*\)\s*\{/g) ?? [];
        for (const match of functionMatches) {
          const result = measureBlockLength(file, match, threshold);
          if (result) issues.push({ ...result, rule: rule.id, severity: rule.severity, message: `函数约 ${result.lines} 行，超过 ${threshold} 行限制` });
        }
      }
      if (file.relativePath.endsWith('.rs')) {
        const functionMatches = file.content.match(/fn\s+\w+\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?:->\s*[^{]+)?\{/g) ?? [];
        for (const match of functionMatches) {
          const result = measureBlockLength(file, match, threshold);
          if (result) issues.push({ ...result, rule: rule.id, severity: rule.severity, message: `函数约 ${result.lines} 行，超过 ${threshold} 行限制` });
        }
      }
      if (file.relativePath.endsWith('.py')) {
        issues.push(...measurePythonFunctionLength(file, threshold));
      }
    }
    return { issues, metrics: [] };
  }

  return { issues: [], metrics: [] };
}

function measurePythonFunctionLength(file: SourceFile, threshold: number): Issue[] {
  const issues: Issue[] = [];
  const lines = file.content.split('\n');
  const defRegex = /^(\s*)def\s+\w+\s*\(/;
  for (let i = 0; i < lines.length; i++) {
    const match = defRegex.exec(lines[i]);
    if (!match) continue;
    const baseIndent = match[1].length;
    let end = i + 1;
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim().length === 0) continue;
      const indent = line.length - line.trimStart().length;
      if (indent <= baseIndent) {
        end = j;
        break;
      }
      end = j + 1;
    }
    const blockLines = end - i;
    if (blockLines > threshold) {
      issues.push({
        file: file.relativePath,
        rule: 'function-length',
        line: i + 1,
        severity: 'warning',
        message: `函数约 ${blockLines} 行，超过 ${threshold} 行限制`,
      });
    }
  }
  return issues;
}
