import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { CodeSpecConfig } from './types.js';

const PROJECT_CONFIG_NAME = '.code-spec.json';
const GLOBAL_CONFIG_DIR = join(homedir(), '.code-spec');
const GLOBAL_CONFIG_PATH = join(GLOBAL_CONFIG_DIR, 'config.json');

export async function loadProjectConfig(projectPath: string): Promise<CodeSpecConfig> {
  const configPath = resolve(projectPath, PROJECT_CONFIG_NAME);
  try {
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content) as CodeSpecConfig;
  } catch {
    return {};
  }
}

export async function saveProjectConfig(projectPath: string, config: CodeSpecConfig): Promise<void> {
  const configPath = resolve(projectPath, PROJECT_CONFIG_NAME);
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function loadGlobalConfig(): Promise<CodeSpecConfig> {
  try {
    await access(GLOBAL_CONFIG_PATH);
    const content = await readFile(GLOBAL_CONFIG_PATH, 'utf-8');
    return JSON.parse(content) as CodeSpecConfig;
  } catch {
    return {};
  }
}

export async function saveGlobalConfig(config: CodeSpecConfig): Promise<void> {
  await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
  await writeFile(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function resolveConfig(projectPath: string): Promise<{ project: CodeSpecConfig; global: CodeSpecConfig }> {
  const project = await loadProjectConfig(projectPath);
  const global = await loadGlobalConfig();
  return { project, global };
}

export function mergeConfig(project: CodeSpecConfig, global: CodeSpecConfig): CodeSpecConfig {
  return {
    techStack: project.techStack ?? global.techStack ?? [],
    rulePacks: project.rulePacks ?? global.rulePacks ?? [
      resolve(process.cwd(), 'rule-packs/common'),
      resolve(process.cwd(), 'rule-packs/typescript'),
    ],
    enableLlmJudge: project.enableLlmJudge ?? global.enableLlmJudge ?? false,
    llm: project.llm ?? global.llm,
    output: {
      format: project.output?.format ?? global.output?.format ?? 'json',
      language: project.output?.language ?? global.output?.language ?? 'zh',
    },
  };
}

export function getDefaultRulePackPaths(): string[] {
  return [
    resolve(process.cwd(), 'rule-packs/common'),
    resolve(process.cwd(), 'rule-packs/typescript'),
  ];
}

export function resolveRulePackPaths(paths: string[], basePath: string): string[] {
  return paths.map((p) => resolve(basePath, p));
}
