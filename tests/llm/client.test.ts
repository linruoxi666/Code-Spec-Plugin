import { describe, it, expect } from 'vitest';
import { createLlmClient } from '../../src/llm/client';
import OpenAI from 'openai';

describe('createLlmClient', () => {
  it('creates OpenAI client with apiKey', () => {
    const client = createLlmClient({ apiKey: 'test-key' });
    expect(client).toBeInstanceOf(OpenAI);
  });

  it('creates OpenAI client with verifySsl disabled', () => {
    const client = createLlmClient({ apiKey: 'test-key', verifySsl: false });
    expect(client).toBeInstanceOf(OpenAI);
  });

  it('throws when apiKey is missing', () => {
    expect(() => createLlmClient({})).toThrow('LLM API key is missing');
  });
});
