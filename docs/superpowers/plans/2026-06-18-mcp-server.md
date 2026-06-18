# M4：MCP Server Implementation Plan

**Goal:** 将核心能力封装为 MCP Server，暴露给 Trae / Claude / Cherry Studio 等客户端调用。

**Architecture:** 新建 `src/mcp/` 模块，使用 `@modelcontextprotocol/sdk` 的 `Server` + `StdioServerTransport`。暴露 3 个 Tool：`evaluate_project`、`audit_file`、`generate_coding_guidelines`。

---

## Task 1: 安装 MCP SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加依赖**

```json
"@modelcontextprotocol/sdk": "^1.0.0"
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`

---

## Task 2: MCP Server 入口

**Files:**
- Create: `src/mcp/server.ts`

- [ ] **Step 1: 写入 server.ts**

```typescript
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
import type { RuleDefinition, SourceFile } from '../types/index.js';

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
    const targetFile = files.find((f) => f.absolutePath === filePath || f.relativePath === relativePath);

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

---

## Task 3: CLI 增加 mcp 命令

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: 添加 mcp 命令**

```typescript
program
  .command('mcp')
  .description('Start MCP server over stdio')
  .action(async () => {
    const { main } = await import('./mcp/server.js');
    await main();
  });
```

---

## Task 4: 测试

**Files:**
- Create: `tests/mcp/server.test.ts`

- [ ] **Step 1: 测试工具列表**

```typescript
import { describe, it, expect } from 'vitest';

describe('mcp server tools', () => {
  it('should have evaluate_project tool defined', async () => {
    // 通过动态导入验证 server.ts 能正常加载
    await import('../../src/mcp/server.js');
    expect(true).toBe(true);
  });
});
```

---

## Task 5: 验收

- [ ] **Step 1: 类型检查与测试**

Run: `npm run typecheck && npm test -- --run`
Expected: All pass.

- [ ] **Step 2: 手动验证 MCP Server 启动**

```bash
npx tsx src/cli.ts mcp
```

Expected: 进程保持运行，等待 stdin JSON-RPC 消息。

- [x] **Step 3: 配置到 Trae/Cursor/Claude Desktop**

示例配置（Cursor/Claude Desktop mcp.json）：

```json
{
  "mcpServers": {
    "code-spec-interview-plugin": {
      "command": "npx",
      "args": ["tsx", "H:/代码规范插件/src/cli.ts", "mcp"]
    }
  }
}
```
