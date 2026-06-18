import prompts from 'prompts';
import { loadGlobalConfig, saveGlobalConfig } from '../config/manager.js';
import type { LlmConfig, LlmProvider } from '../config/types.js';

export interface ProviderPreset {
  name: string;
  value: LlmProvider;
  baseURL: string;
  defaultModel: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { name: 'OpenAI / Azure OpenAI', value: 'openai', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
  { name: 'DeepSeek', value: 'deepseek', baseURL: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  { name: 'Moonshot (Kimi)', value: 'moonshot', baseURL: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  { name: 'SiliconFlow', value: 'siliconflow', baseURL: 'https://api.siliconflow.cn/v1', defaultModel: 'deepseek-ai/DeepSeek-V3' },
  { name: '智谱 AI (GLM)', value: 'zhipu', baseURL: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4' },
  { name: '火山引擎 (豆包)', value: 'volcano', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-lite-4k' },
  { name: '阿里云百炼', value: 'aliyun', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-turbo' },
  { name: '百度千帆', value: 'baidu', baseURL: 'https://qianfan.baidubce.com/v2', defaultModel: 'ernie-lite-v8' },
  { name: '腾讯混元', value: 'tencent', baseURL: 'https://hunyuan.tencentcloudapi.com/v1', defaultModel: 'hunyuan-lite' },
  { name: '自定义 OpenAI 兼容接口', value: 'custom', baseURL: '', defaultModel: '' },
];

export function hasLlmApiKey(config?: LlmConfig): boolean {
  return Boolean(config?.apiKey && config.apiKey.trim().length > 0);
}

export function formatMissingApiKeyMessage(): string {
  return [
    '未找到 LLM API Key。请通过以下任一方式配置：',
    '',
    '1. 环境变量：',
    '   export LLM_API_KEY=your-api-key',
    '   export LLM_BASE_URL=https://api.openai.com/v1  （可选，国内厂商必填）',
    '   export LLM_MODEL=gpt-4o-mini                    （可选）',
    '',
    '2. 全局配置（推荐，不会进入项目仓库）：',
    '   csi config set llm.apiKey <your-key> --global',
    '   csi config set llm.baseURL <base-url> --global',
    '   csi config set llm.provider <provider> --global',
    '',
    '3. 项目级 .env 文件：',
    '   cp .env.example .env',
    '   # 编辑 .env 填入 LLM_API_KEY、LLM_BASE_URL、LLM_PROVIDER、LLM_VERIFY_SSL',
  ].join('\n');
}

export function getProviderPreset(provider: LlmProvider): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.value === provider);
}

export async function promptForApiKey(): Promise<LlmConfig | null> {
  const providerResponse = await prompts({
    type: 'select',
    name: 'provider',
    message: '选择模型厂商：',
    choices: PROVIDER_PRESETS.map((p) => ({ title: p.name, value: p.value })),
    initial: 0,
  });

  const provider = providerResponse.provider as LlmProvider | undefined;
  if (!provider) return null;

  const preset = getProviderPreset(provider);
  const isCustom = provider === 'custom';

  const questions: prompts.PromptObject<string>[] = [
    {
      type: 'text',
      name: 'apiKey',
      message: '请输入 API Key：',
      validate: (value: string) => value.trim().length > 0 ? true : 'API Key 不能为空',
    },
  ];

  if (isCustom || !preset) {
    questions.push({
      type: 'text',
      name: 'baseURL',
      message: '请输入 Base URL（OpenAI 兼容接口，例如 https://api.example.com/v1）：',
      validate: (value: string) => value.trim().length > 0 ? true : 'Base URL 不能为空',
    });
    questions.push({
      type: 'text',
      name: 'model',
      message: '请输入模型名称：',
      validate: (value: string) => value.trim().length > 0 ? true : '模型名称不能为空',
    });
  } else {
    questions.push({
      type: 'text',
      name: 'model',
      message: `请输入模型名称（直接回车使用默认 ${preset.defaultModel}）：`,
    });
  }

  questions.push({
    type: 'confirm',
    name: 'verifySsl',
    message: '是否启用 SSL 证书校验？（如果遇到握手失败可关闭，生产环境建议开启）',
    initial: true,
  });

  const response = await prompts(questions, {
    onCancel: () => {
      console.log('已取消输入');
      process.exit(0);
    },
  });

  if (!response.apiKey) return null;

  const newConfig: LlmConfig = {
    provider,
    apiKey: response.apiKey,
    baseURL: isCustom ? response.baseURL : (response.baseURL || preset?.baseURL),
    model: response.model || preset?.defaultModel,
    verifySsl: response.verifySsl,
  };

  const config = await loadGlobalConfig();
  config.llm = newConfig;
  await saveGlobalConfig(config);
  console.log('LLM 配置已保存到全局配置 ~/.code-spec/config.json');
  if (response.verifySsl === false) {
    console.log('⚠️  SSL 校验已关闭，仅建议开发/测试环境使用');
  }

  return newConfig;
}
