import OpenAI from 'openai';

export interface LlmConfig {
  baseURL?: string;
  apiKey?: string;
  model?: string;
}

export function createLlmClient(config: LlmConfig): OpenAI {
  if (!config.apiKey) {
    throw new Error('LLM API key is missing');
  }
  return new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
  });
}

export function getLlmConfigFromEnv(): LlmConfig {
  return {
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY ?? '',
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  };
}
