export type LlmProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'moonshot'
  | 'siliconflow'
  | 'zhipu'
  | 'volcano'
  | 'aliyun'
  | 'baidu'
  | 'tencent'
  | 'custom';

export interface LlmConfig {
  provider?: LlmProvider;
  model?: string;
  baseURL?: string;
  apiKey?: string;
  verifySsl?: boolean;
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
