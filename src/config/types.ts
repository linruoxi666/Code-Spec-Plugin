export interface LlmConfig {
  provider?: 'openai' | 'anthropic' | 'deepseek' | 'volcano';
  model?: string;
  baseURL?: string;
  apiKey?: string;
}

export interface CodeSpecConfig {
  techStack?: string[];
  rulePacks?: string[];
  enableLlmJudge?: boolean;
  llm?: LlmConfig;
  output?: {
    format?: 'json' | 'table';
    language?: 'zh' | 'en';
  };
}

export type GlobalConfig = CodeSpecConfig;
