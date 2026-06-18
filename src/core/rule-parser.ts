import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { RuleDefinition, RulePack } from '../types/index.js';

export async function loadRulePack(rulePackPath: string): Promise<RulePack> {
  const files = await readdir(rulePackPath);
  const rules: RuleDefinition[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const content = await readFile(join(rulePackPath, file), 'utf-8');
    const rule = JSON.parse(content) as RuleDefinition;
    rules.push(rule);
  }

  const name = rulePackPath.split(/[\\/]/).pop() ?? 'unknown';
  return { name, rules };
}

export async function loadRulePacks(paths: string[]): Promise<RulePack[]> {
  return Promise.all(paths.map(loadRulePack));
}
