import { checkAst } from '../rules/ast-checker.js';
import { calculateMetrics } from '../rules/metric-calculator.js';
import { runLinter } from '../rules/linter-aggregator.js';
import type { Issue, MetricValue, RuleDefinition, SourceFile } from '../types/index.js';

export async function executeRule(files: SourceFile[], rule: RuleDefinition): Promise<{ issues: Issue[]; metrics: MetricValue[] }> {
  switch (rule.check.type) {
    case 'ast-query':
      return { issues: checkAst(files, rule), metrics: [] };
    case 'metric':
      return calculateMetrics(files, rule);
    case 'linter':
      return { issues: await runLinter(files, rule), metrics: [] };
    default:
      return { issues: [], metrics: [] };
  }
}
