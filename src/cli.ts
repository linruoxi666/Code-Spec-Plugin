#!/usr/bin/env node
import { Command } from 'commander';
import { evaluateProject } from './core/rule-engine.js';
import { generateGuidelines } from './guidelines/injector.js';
import { initCommand } from './commands/init.js';
import { showConfigCommand, setConfigCommand } from './commands/config.js';
import { resolveConfig, mergeConfig, resolveRulePackPaths, getDefaultRulePackPaths } from './config/manager.js';
import { hasLlmApiKey, promptForApiKey, formatMissingApiKeyMessage } from './llm/config-helper.js';
import prompts from 'prompts';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { renderReportHtml } from './report/html-reporter.js';

const program = new Command();

program
  .name('csi')
  .description('Code Spec Plugin CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize project configuration interactively')
  .argument('[path]', 'project path', '.')
  .action(async (projectPath: string) => {
    await initCommand(projectPath);
  });

program
  .command('config')
  .description('Show or set configuration')
  .option('--global', 'operate on global config')
  .option('--project <path>', 'operate on specific project config')
  .argument('[key]', 'config key')
  .argument('[value]', 'config value')
  .argument('[extra]', 'config value when using "config set <key> <value>"')
  .action(async (
    key?: string,
    value?: string,
    extra?: string,
    options?: { global?: boolean; project?: string },
  ) => {
    let realKey = key;
    let realValue = value;

    if (key === 'set' && value !== undefined && extra !== undefined) {
      realKey = value;
      realValue = extra;
    }

    if (realKey && realValue !== undefined) {
      await setConfigCommand(realKey, realValue, options ?? {});
    } else {
      await showConfigCommand(options?.project);
    }
  });

program
  .command('evaluate')
  .description('Evaluate a project')
  .argument('<path>', 'project path')
  .option('--rules <paths...>', 'rule pack paths')
  .option('--llm', 'enable LLM Judge for innovation, architecture and security dimensions')
  .option('--report <path>', 'write a self-contained HTML report to the given path')
  .action(async (projectPath: string, options: { rules?: string[]; llm?: boolean; report?: string }) => {
    const absolutePath = resolve(projectPath);
    const { project, global } = await resolveConfig(absolutePath);
    const config = mergeConfig(project, global);

    const rulePackPaths = options.rules?.map((p) => resolve(p))
      ?? resolveRulePackPaths(config.rulePacks ?? getDefaultRulePackPaths(), absolutePath);

    const enableLlmJudge = options.llm ?? config.enableLlmJudge;

    if (enableLlmJudge && !hasLlmApiKey(config.llm)) {
      console.log('\n' + formatMissingApiKeyMessage());
      console.log('\n是否现在输入 API Key 并保存到全局配置？');

      const { usePrompt } = await prompts({
        type: 'confirm',
        name: 'usePrompt',
        message: '立即输入 API Key？',
        initial: true,
      });

      if (usePrompt) {
        const newLlmConfig = await promptForApiKey();
        if (newLlmConfig) {
          config.llm = { ...config.llm, ...newLlmConfig };
        }
      } else {
        process.exit(1);
      }
    }

    const report = await evaluateProject({
      projectPath: absolutePath,
      rulePackPaths,
      enableLlmJudge,
      llmConfig: config.llm,
    });

    if (options.report) {
      const reportPath = resolve(options.report);
      writeFileSync(reportPath, renderReportHtml(report), 'utf8');
      console.log(`HTML report written to ${reportPath}`);
    }

    console.log(JSON.stringify(report, null, 2));
  });

program
  .command('inject')
  .description('Generate and optionally write pre-coding guidelines')
  .argument('<path>', 'project path')
  .option('--rules <paths...>', 'rule pack paths')
  .option('--write', 'write guideline files to project')
  .action(async (projectPath: string, options: { rules?: string[]; write?: boolean }) => {
    const absolutePath = resolve(projectPath);
    const { project, global } = await resolveConfig(absolutePath);
    const config = mergeConfig(project, global);

    const rulePackPaths = options.rules?.map((p) => resolve(p))
      ?? resolveRulePackPaths(config.rulePacks ?? getDefaultRulePackPaths(), absolutePath);

    const result = await generateGuidelines({
      projectPath: absolutePath,
      rulePackPaths,
      writeFiles: options.write,
    });

    if (options.write) {
      console.log('Written files:');
      for (const file of result.writtenFiles ?? []) {
        console.log(`  - ${file}`);
      }
    } else {
      console.log(result.systemPrompt);
    }
  });

program
  .command('mcp')
  .description('Start MCP server over stdio')
  .action(async () => {
    const { main } = await import('./mcp/server.js');
    await main();
  });

program.parse();
