#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { evaluateProject } from '../core/rule-engine.js';
import { executeRule } from '../core/rule-executor.js';
import { loadRulePack } from '../core/rule-parser.js';
import { scanProject } from '../core/project-scanner.js';
import { generateGuidelines } from '../guidelines/injector.js';
import { resolve } from 'node:path';
import type { SourceFile } from '../types/index.js';

const server = new Server(
  {
    name: 'code-spec-interview-plugin',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'evaluate_project',
        description: 'Evaluate a project and return dimension scores and issues',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute or relative project path' },
            enableLlmJudge: { type: 'boolean', description: 'Enable LLM Judge for innovation dimension' },
          },
          required: ['path'],
        },
      },
      {
        name: 'audit_file',
        description: 'Audit a single source file against rule packs',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute or relative file path' },
          },
          required: ['path'],
        },
      },
      {
        name: 'generate_coding_guidelines',
        description: 'Generate pre-coding guidelines for a project',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute or relative project path' },
          },
          required: ['path'],
        },
      },
    ],
  };
});

const defaultRulePacks = [
  resolve(process.cwd(), 'rule-packs/common'),
  resolve(process.cwd(), 'rule-packs/typescript'),
];

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'Missing arguments' }) }],
      isError: true,
    };
  }

  if (name === 'evaluate_project') {
    const projectPath = resolve(String(args.path));
    const report = await evaluateProject({
      projectPath,
      rulePackPaths: defaultRulePacks,
      enableLlmJudge: Boolean(args.enableLlmJudge),
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }

  if (name === 'audit_file') {
    const filePath = resolve(String(args.path));
    const projectPath = resolve(filePath, '..');
    const relativePath = filePath.split(/[\\/]/).pop() ?? filePath;
    const files = await scanProject(projectPath);
    const targetFile = files.find((f: SourceFile) => f.absolutePath === filePath || f.relativePath === relativePath);

    if (!targetFile) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'File not found' }) }],
        isError: true,
      };
    }

    const rulePacks = await Promise.all(defaultRulePacks.map(loadRulePack));
    const allRules = rulePacks.flatMap((p) => p.rules);
    const allIssues = [];
    for (const rule of allRules) {
      const result = await executeRule([targetFile], rule);
      allIssues.push(...result.issues);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ file: relativePath, issues: allIssues }, null, 2) }],
    };
  }

  if (name === 'generate_coding_guidelines') {
    const projectPath = resolve(String(args.path));
    const guidelines = await generateGuidelines({
      projectPath,
      rulePackPaths: defaultRulePacks,
    });
    return {
      content: [{ type: 'text', text: guidelines.systemPrompt }],
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown tool' }) }],
    isError: true,
  };
});

export async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
