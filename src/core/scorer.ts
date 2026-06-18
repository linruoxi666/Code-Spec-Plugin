import type { Dimension, DimensionResult, Issue, MetricValue, RuleDefinition } from '../types/index.js';

export const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  创新: 0.2,
  架构: 0.2,
  安全: 0.2,
  规范: 0.2,
  简洁: 0.15,
  注释: 0.05,
};

export function scoreDimensions(
  rules: RuleDefinition[],
  issues: Issue[],
  metrics: MetricValue[],
  userWeights: Partial<Record<Dimension, number>> = {},
): DimensionResult[] {
  const weights = { ...DEFAULT_WEIGHTS, ...userWeights };
  const dimensions: Dimension[] = ['创新', '架构', '安全', '规范', '简洁', '注释'];

  return dimensions.map((dimension) => {
    const dimensionRules = rules.filter((r) => r.dimension === dimension);
    const dimensionIssues = issues.filter((i) => dimensionRules.some((r) => r.id === i.rule));

    let score = 10;
    for (const rule of dimensionRules) {
      const ruleIssues = dimensionIssues.filter((i) => i.rule === rule.id);
      const penalty = ruleIssues.length * (rule.severity === 'error' ? 1.5 : rule.severity === 'warning' ? 0.8 : 0.3);
      score -= penalty * rule.weight * 10;
    }

    const dimensionMetrics = metrics.filter((m) =>
      dimensionRules.some((r) => r.id.includes(m.name.toLowerCase())),
    );

    return {
      dimension,
      score: Math.max(0, Math.min(10, score)),
      issues: dimensionIssues,
      metrics: dimensionMetrics,
    };
  });
}

export function calculateTotalScore(
  dimensions: DimensionResult[],
  userWeights: Partial<Record<Dimension, number>> = {},
): number {
  const weights = { ...DEFAULT_WEIGHTS, ...userWeights };
  return dimensions.reduce((sum, d) => sum + d.score * weights[d.dimension], 0);
}
