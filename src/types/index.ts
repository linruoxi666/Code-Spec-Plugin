export type Dimension = '创新' | '规范' | '简洁' | '注释';

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  severity: Severity;
  message: string;
}

export interface MetricValue {
  name: string;
  value: number;
  unit?: string;
}

export interface DimensionResult {
  dimension: Dimension;
  score: number;
  issues: Issue[];
  metrics: MetricValue[];
}

export interface RuleCheck {
  type: 'ast-query' | 'metric' | 'linter';
  pattern?: string;
  message: string;
  threshold?: number;
}

export interface RuleDefinition {
  id: string;
  dimension: Dimension;
  weight: number;
  severity: Severity;
  check: RuleCheck;
}

export interface RulePack {
  name: string;
  language?: string;
  rules: RuleDefinition[];
}

export interface SourceFile {
  relativePath: string;
  absolutePath: string;
  content: string;
}

export interface EvaluateOptions {
  projectPath: string;
  rulePackPaths?: string[];
  weights?: Partial<Record<Dimension, number>>;
  enableLlmJudge?: boolean;
  llmConfig?: {
    baseURL?: string;
    apiKey?: string;
    model?: string;
  };
}

export interface EvaluateReport {
  totalScore: number;
  dimensions: DimensionResult[];
  issues: Issue[];
}
