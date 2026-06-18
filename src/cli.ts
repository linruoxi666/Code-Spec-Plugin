#!/usr/bin/env node
import { Command } from 'commander';
import { evaluateProject } from './core/rule-engine.js';
import { generateGuidelines } from './guidelines/injector.js';
import { initCommand } from './commands/init.js';
import { showConfigCommand, setConfigCommand } from './commands/config.js';
import { resolveConfig, mergeConfig, resolveRulePackPaths, getDefaultRulePackPaths } from './config/manager.js';
import { resolve } from 'node:path';

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
  .action(async (key?: string, value?: string, options?: { global?: boolean; project?: string }) => {
    if (key && value !== undefined) {
      await setConfigCommand(key, value, options ?? {});
    } else {
      await showConfigCommand(options?.project);
    }
  });

program
  .command('evaluate')
  .description('Evaluate a project')
  .argument('<path>', 'project path')
  .option('--rules <paths...>', 'rule pack paths')
  .option('--llm', 'enable LLM Judge for innovation dimension')
  .action(async (projectPath: string, options: { rules?: string[]; llm?: boolean }) => {
    const absolutePath = resolve(projectPath);
    const { project, global } = await resolveConfig(absolutePath);
    const config = mergeConfig(project, global);

    const rulePackPaths = options.rules?.map((p) => resolve(p))
      ?? resolveRulePackPaths(config.rulePacks ?? getDefaultRulePackPaths(), absolutePath);

    const report = await evaluateProject({
      projectPath: absolutePath,
      rulePackPaths,
      enableLlmJudge: options.llm ?? config.enableLlmJudge,
      llmConfig: config.llm,
    });
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
