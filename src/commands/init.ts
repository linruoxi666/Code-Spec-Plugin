import prompts from 'prompts';
import { resolve } from 'node:path';
import { saveProjectConfig } from '../config/manager.js';
import { hasLlmApiKey, promptForApiKey } from '../llm/config-helper.js';
import type { CodeSpecConfig } from '../config/types.js';

const availableTechStacks = [
  { title: 'TypeScript', value: 'typescript' },
  { title: 'React', value: 'react' },
  { title: 'Next.js', value: 'nextjs' },
  { title: 'Node.js', value: 'nodejs' },
  { title: 'Java', value: 'java' },
  { title: 'Go', value: 'go' },
  { title: 'Python', value: 'python' },
  { title: 'Kotlin / Android', value: 'kotlin' },
  { title: 'Rust', value: 'rust' },
];

export async function initCommand(projectPath: string): Promise<void> {
  const absolutePath = resolve(projectPath);

  const response = await prompts([
    {
      type: 'multiselect',
      name: 'techStack',
      message: '选择项目使用的技术栈（可多选）',
      choices: availableTechStacks,
      hint: '- 空格选择，回车确认',
    },
    {
      type: 'confirm',
      name: 'useLlmJudge',
      message: '是否启用 LLM Judge 对创新、架构、安全维度评分？（需要 API Key）',
      initial: false,
    },
    {
      type: 'select',
      name: 'outputFormat',
      message: '选择默认输出格式',
      choices: [
        { title: 'JSON', value: 'json' },
        { title: '表格', value: 'table' },
      ],
      initial: 0,
    },
    {
      type: 'confirm',
      name: 'writeGuidelines',
      message: '是否立即生成各平台规范配置文件？',
      initial: true,
    },
  ], {
    onCancel: () => {
      console.log('已取消初始化');
      process.exit(0);
    },
  });

  const rulePacks = buildRulePacks(response.techStack as string[]);

  if (response.useLlmJudge) {
    const global = await import('../config/manager.js').then((m) => m.loadGlobalConfig());
    if (!hasLlmApiKey(global.llm)) {
      console.log('\n启用 LLM Judge 需要配置 API Key。');
      await promptForApiKey();
    }
  }

  const config: CodeSpecConfig = {
    techStack: response.techStack as string[],
    rulePacks,
    enableLlmJudge: response.useLlmJudge as boolean,
    output: {
      format: response.outputFormat as 'json' | 'table',
      language: 'zh',
    },
  };

  await saveProjectConfig(absolutePath, config);
  console.log(`\n已在 ${resolve(absolutePath, '.code-spec.json')} 创建配置`);

  if (response.writeGuidelines) {
    const { generateGuidelines } = await import('../guidelines/injector.js');
    const result = await generateGuidelines({
      projectPath: absolutePath,
      rulePackPaths: rulePacks.map((p) => resolve(absolutePath, p)),
      writeFiles: true,
    });
    console.log('已生成规范配置文件：');
    for (const file of result.writtenFiles ?? []) {
      console.log(`  - ${file}`);
    }
  }

  console.log('\n下一步：');
  console.log(`  csi evaluate ${projectPath}`);
  if (response.useLlmJudge) {
    console.log('  LLM Judge 已启用，API Key 已保存到全局配置');
  }
}

function buildRulePacks(techStack: string[]): string[] {
  const packs = ['rule-packs/common'];
  if (techStack.includes('typescript') || techStack.includes('react') || techStack.includes('nextjs') || techStack.includes('nodejs')) {
    packs.push('rule-packs/typescript');
  }
  if (techStack.includes('react') || techStack.includes('nextjs')) {
    packs.push('rule-packs/react');
  }
  if (techStack.includes('java')) {
    packs.push('rule-packs/java');
  }
  if (techStack.includes('go')) {
    packs.push('rule-packs/go');
  }
  if (techStack.includes('python')) {
    packs.push('rule-packs/python');
  }
  if (techStack.includes('kotlin')) {
    packs.push('rule-packs/kotlin');
  }
  if (techStack.includes('rust')) {
    packs.push('rule-packs/rust');
  }
  return packs;
}
