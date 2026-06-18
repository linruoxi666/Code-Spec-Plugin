import type { RuleDefinition } from '../types/index.js';
import type { TechStack } from './tech-detector.js';
import type { FreshnessRule } from './freshness.js';

export interface PromptInput {
  techStack: TechStack;
  rules: RuleDefinition[];
  freshnessWarnings: FreshnessRule[];
}

export function buildSystemPrompt(input: PromptInput): string {
  const lines: string[] = [];
  lines.push('你是资深软件工程师，请严格遵守以下规范编写代码。');
  lines.push('');

  if (input.techStack.languages.length > 0) {
    lines.push(`技术栈：${input.techStack.languages.join('、')}。`);
  }
  if (input.techStack.frameworks.length > 0) {
    lines.push(`框架：${input.techStack.frameworks.join('、')}。`);
  }

  if (input.freshnessWarnings.length > 0) {
    lines.push('');
    lines.push('版本 freshness 提示：');
    for (const warning of input.freshnessWarnings) {
      lines.push(`- ${warning.message}`);
    }
  }

  lines.push('');
  lines.push('代码规范：');
  for (const rule of input.rules) {
    lines.push(`- [${rule.dimension}] ${rule.check.message}`);
  }

  return lines.join('\n');
}

export function buildCursorRules(input: PromptInput): string {
  return buildSystemPrompt(input);
}

export function buildTraeRules(input: PromptInput): string {
  return `# Project Rules\n\n${buildSystemPrompt(input)}`;
}

export function buildCopilotInstructions(input: PromptInput): string {
  return `# Copilot Instructions\n\n${buildSystemPrompt(input)}`;
}
