import { resolve } from 'node:path';
import {
  loadGlobalConfig,
  saveGlobalConfig,
  loadProjectConfig,
  saveProjectConfig,
  mergeConfig,
} from '../config/manager.js';
import type { CodeSpecConfig, LlmConfig } from '../config/types.js';
export async function showConfigCommand(projectPath?: string): Promise<void> {
  const absolutePath = projectPath ? resolve(projectPath) : process.cwd();
  const project = await loadProjectConfig(absolutePath);
  const global = await loadGlobalConfig();
  const merged = mergeConfig(project, global);

  console.log('项目配置：');
  console.log(JSON.stringify(project, null, 2));
  console.log('\n全局配置：');
  console.log(JSON.stringify(global, null, 2));
  console.log('\n生效配置：');
  console.log(JSON.stringify(merged, null, 2));
}

export async function setConfigCommand(
  key: string,
  value: string,
  options: { global?: boolean; project?: string },
): Promise<void> {
  if (key.startsWith('llm.')) {
    await setLlmConfig(key, value, options);
    return;
  }

  if (options.global) {
    const config = await loadGlobalConfig();
    setNestedValue(castToRecord(config), key, parseValue(value));
    await saveGlobalConfig(config);
    console.log(`全局配置已更新：${key} = ${value}`);
  } else {
    const projectPath = options.project ?? process.cwd();
    const config = await loadProjectConfig(projectPath);
    setNestedValue(castToRecord(config), key, parseValue(value));
    await saveProjectConfig(projectPath, config);
    console.log(`项目配置已更新：${key} = ${value}`);
  }
}

async function setLlmConfig(
  key: string,
  value: string,
  options: { global?: boolean; project?: string },
): Promise<void> {
  const llmKey = key.slice(4);
  if (options.global) {
    const config = await loadGlobalConfig();
    config.llm = config.llm ?? ({} as LlmConfig);
    setNestedValue(castToRecord(config.llm), llmKey, parseValue(value));
    await saveGlobalConfig(config);
    console.log(`全局 LLM 配置已更新：${llmKey} = ${value}`);
  } else {
    const projectPath = options.project ?? process.cwd();
    const config = await loadProjectConfig(projectPath);
    config.llm = config.llm ?? ({} as LlmConfig);
    setNestedValue(castToRecord(config.llm), llmKey, parseValue(value));
    await saveProjectConfig(projectPath, config);
    console.log(`项目 LLM 配置已更新：${llmKey} = ${value}`);
    console.log('⚠️  警告：LLM API Key 配置在项目文件中可能随仓库泄露，建议使用 --global 配置到全局。');
  }
}

function parseValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function castToRecord(obj: object): Record<string, unknown> {
  return obj as Record<string, unknown>;
}
