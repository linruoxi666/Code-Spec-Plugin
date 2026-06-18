import OpenAI from 'openai';
import { fetch as undiciFetch, Agent } from 'undici';
import type { LlmConfig } from '../config/types.js';
import type { Fetch } from 'openai/core';

export { type LlmConfig } from '../config/types.js';

export function createLlmClient(config: LlmConfig): OpenAI {
  if (!config.apiKey) {
    throw new Error(
      'LLM API key is missing. Configure it via LLM_API_KEY env, global config (csi config set llm.apiKey <key> --global), or .env file.',
    );
  }

  const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
  };

  if (config.verifySsl === false) {
    const agent = new Agent({ connect: { rejectUnauthorized: false } });
    const customFetch: Fetch = (url, init) =>
      undiciFetch(url as string, { ...(init ?? {}), dispatcher: agent } as any) as unknown as ReturnType<Fetch>;
    clientOptions.fetch = customFetch;
  }

  return new OpenAI(clientOptions);
}

export function getLlmConfigFromEnv(): LlmConfig {
  return {
    provider: (process.env.LLM_PROVIDER as LlmConfig['provider']) ?? 'openai',
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY ?? '',
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
    verifySsl: process.env.LLM_VERIFY_SSL === 'false' ? false : true,
  };
}
