import { scanProject } from './project-scanner.js';
import { loadRulePacks } from './rule-parser.js';
import { executeRule } from './rule-executor.js';
import { calculateTotalScore, scoreDimensions, DEFAULT_WEIGHTS } from './scorer.js';
import { createLlmClient, getLlmConfigFromEnv } from '../llm/client.js';
import { getProviderPreset } from '../llm/config-helper.js';
import {
  judgeInnovationWithConsensus,
  judgeArchitectureWithConsensus,
  judgeSecurityWithConsensus,
} from '../llm/consensus.js';
import type { EvaluateOptions, EvaluateReport, Issue, MetricValue, DimensionResult } from '../types/index.js';

export async function evaluateProject(options: EvaluateOptions): Promise<EvaluateReport> {
  const files = await scanProject(options.projectPath);
  const rulePacks = options.rulePackPaths?.length
    ? await loadRulePacks(options.rulePackPaths)
    : [];

  const allIssues: Issue[] = [];
  const allMetrics: MetricValue[] = [];

  for (const pack of rulePacks) {
    for (const rule of pack.rules) {
      const result = await executeRule(files, rule);
      allIssues.push(...result.issues.map((issue) => ({ ...issue, dimension: rule.dimension })));
      allMetrics.push(...result.metrics);
    }
  }

  const allRules = rulePacks.flatMap((p) => p.rules);
  const dimensions = scoreDimensions(allRules, allIssues, allMetrics, options.weights);

  if (options.enableLlmJudge) {
    try {
      const config = normalizeLlmConfig(options.llmConfig ?? getLlmConfigFromEnv());
      if (!config.apiKey) {
        throw new Error('LLM API key is missing');
      }
      const client = createLlmClient(config);
      const model = config.model ?? 'gpt-4o-mini';

      const [innovation, architecture, security] = await Promise.all([
        judgeInnovationWithConsensus(client, model, files),
        judgeArchitectureWithConsensus(client, model, files),
        judgeSecurityWithConsensus(client, model, files),
      ]);

      applyLlmDimension(dimensions, '创新', innovation.score, innovation.reason);
      applyLlmDimension(dimensions, '架构', architecture.score, architecture.reason);
      applyLlmDimension(dimensions, '安全', security.score, security.reason, security.vulnerabilities);
    } catch (error) {
      applyLlmFailure(dimensions, error);
    }
  } else {
    markLlmSkipped(dimensions);
  }

  const baseWeights = options.weights ?? {};
  const effectiveWeights = options.enableLlmJudge
    ? baseWeights
    : normalizeWeights(withoutLlmDimensions(baseWeights));

  const totalScore = calculateTotalScore(dimensions, effectiveWeights);

  return {
    totalScore,
    dimensions,
    issues: allIssues,
  };
}

function applyLlmDimension(
  dimensions: DimensionResult[],
  dimensionName: '创新' | '架构' | '安全',
  score: number,
  reason: string,
  vulnerabilities?: Array<{ severity: string; description: string; file?: string }>,
): void {
  const dimension = dimensions.find((d) => d.dimension === dimensionName);
  if (!dimension) return;

  dimension.score = score;
  dimension.issues.push({
    file: 'project',
    rule: `llm-${dimensionName}`,
    severity: 'info',
    message: reason,
  });

  if (dimensionName === '安全' && vulnerabilities && vulnerabilities.length > 0) {
    for (const v of vulnerabilities) {
      dimension.issues.push({
        file: v.file ?? 'project',
        rule: 'llm-security-vulnerability',
        severity: mapSecuritySeverity(v.severity),
        message: `[${v.severity}] ${v.description}`,
      });
    }
  }
}

function mapSecuritySeverity(severity: string): 'error' | 'warning' | 'info' {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    default:
      return 'info';
  }
}

function applyLlmFailure(dimensions: DimensionResult[], error: unknown): void {
  const message = `LLM Judge 失败：${error instanceof Error ? error.message : String(error)}`;
  for (const dimension of dimensions) {
    if (['创新', '架构', '安全'].includes(dimension.dimension)) {
      dimension.score = 0;
      dimension.issues.push({
        file: 'project',
        rule: `llm-${dimension.dimension}`,
        severity: 'warning',
        message,
      });
    }
  }
}

function markLlmSkipped(dimensions: DimensionResult[]): void {
  for (const dimension of dimensions) {
    if (['创新', '架构', '安全'].includes(dimension.dimension)) {
      dimension.score = 0;
      dimension.issues.push({
        file: 'project',
        rule: `llm-${dimension.dimension}`,
        severity: 'info',
        message: 'LLM Judge 未启用，该维度未评分',
      });
    }
  }
}

function withoutLlmDimensions(
  weights: Partial<Record<'创新' | '架构' | '安全' | '规范' | '简洁' | '注释', number>> = {},
): Partial<Record<'创新' | '架构' | '安全' | '规范' | '简洁' | '注释', number>> {
  return {
    ...DEFAULT_WEIGHTS,
    ...weights,
    创新: 0,
    架构: 0,
    安全: 0,
  };
}

function normalizeWeights(
  weights: Partial<Record<'创新' | '架构' | '安全' | '规范' | '简洁' | '注释', number>>,
): Partial<Record<'创新' | '架构' | '安全' | '规范' | '简洁' | '注释', number>> {
  const values = Object.values(weights);
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;

  const normalized: Partial<Record<'创新' | '架构' | '安全' | '规范' | '简洁' | '注释', number>> = {};
  for (const [key, value] of Object.entries(weights)) {
    normalized[key as '创新' | '架构' | '安全' | '规范' | '简洁' | '注释'] = value / sum;
  }
  return normalized;
}

function normalizeLlmConfig(config: import('../config/types.js').LlmConfig): import('../config/types.js').LlmConfig {
  const preset = config.provider ? getProviderPreset(config.provider) : undefined;
  return {
    ...config,
    baseURL: config.baseURL ?? preset?.baseURL,
    model: config.model ?? preset?.defaultModel,
    verifySsl: config.verifySsl ?? true,
  };
}
