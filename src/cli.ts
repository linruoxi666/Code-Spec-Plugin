#!/usr/bin/env node
import { Command } from 'commander';
import { evaluateProject } from './core/rule-engine.js';
import { generateGuidelines } from './guidelines/injector.js';
import { resolve } from 'node:path';

const program = new Command();

program
  .name('csi')
  .description('Code Spec Interview Plugin CLI')
  .version('0.1.0');

program
  .command('evaluate')
  .description('Evaluate a project')
  .argument('<path>', 'project path')
  .option('--rules <paths...>', 'rule pack paths')
  .option('--llm', 'enable LLM Judge for innovation dimension')
  .action(async (projectPath: string, options: { rules?: string[]; llm?: boolean }) => {
    const absolutePath = resolve(projectPath);
    const rulePackPaths = options.rules?.map((p) => resolve(p)) ?? [
      resolve(process.cwd(), 'rule-packs/common'),
      resolve(process.cwd(), 'rule-packs/typescript'),
    ];

    const report = await evaluateProject({
      projectPath: absolutePath,
      rulePackPaths,
      enableLlmJudge: options.llm,
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
    const rulePackPaths = options.rules?.map((p) => resolve(p)) ?? [
      resolve(process.cwd(), 'rule-packs/common'),
      resolve(process.cwd(), 'rule-packs/typescript'),
    ];

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
