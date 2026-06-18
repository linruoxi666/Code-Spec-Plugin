import { scanProject } from './project-scanner.js';
import { loadRulePacks } from './rule-parser.js';
import { executeRule } from './rule-executor.js';
import { calculateTotalScore, scoreDimensions } from './scorer.js';
import { createLlmClient, getLlmConfigFromEnv } from '../llm/client.js';
import { judgeInnovationWithConsensus } from '../llm/consensus.js';
import type { EvaluateOptions, EvaluateReport, Issue, MetricValue } from '../types/index.js';

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
      allIssues.push(...result.issues);
      allMetrics.push(...result.metrics);
    }
  }

  const allRules = rulePacks.flatMap((p) => p.rules);
  const dimensions = scoreDimensions(allRules, allIssues, allMetrics, options.weights);

  if (options.enableLlmJudge) {
    try {
      const config = options.llmConfig ?? getLlmConfigFromEnv();
      if (!config.apiKey) {
        throw new Error('LLM API key is missing');
      }
      const client = createLlmClient(config);
      const model = config.model ?? 'gpt-4o-mini';
      const innovation = await judgeInnovationWithConsensus(client, model, files);

      const innovationDimension = dimensions.find((d) => d.dimension === '创新');
      if (innovationDimension) {
        innovationDimension.score = innovation.score;
        innovationDimension.issues.push({
          file: 'project',
          rule: 'llm-innovation',
          severity: 'info',
          message: innovation.reason,
        });
      }
    } catch (error) {
      const innovationDimension = dimensions.find((d) => d.dimension === '创新');
      if (innovationDimension) {
        innovationDimension.score = 0;
        innovationDimension.issues.push({
          file: 'project',
          rule: 'llm-innovation',
          severity: 'warning',
          message: `LLM Judge 失败：${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  const totalScore = calculateTotalScore(dimensions, options.weights);

  return {
    totalScore,
    dimensions,
    issues: allIssues,
  };
}
