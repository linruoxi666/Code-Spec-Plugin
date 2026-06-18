# M3：写前规范注入器 Implementation Plan

**Goal:** 根据项目技术栈和规则包，自动生成并导出各 AI 平台的写前规范配置，让 AI 在写代码前就使用最新技术和规范。

**Architecture:** 新增 `src/guidelines/` 模块。`GuidelineInjector` 读取规则包 + 技术栈检测，生成通用 System Prompt 和各平台配置文件。CLI 增加 `inject` 命令。

---

## Task 1: 技术栈检测器

**Files:**
- Create: `src/guidelines/tech-detector.ts`

- [ ] **Step 1: 实现检测器**

```typescript
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SourceFile } from '../types/index.js';

export interface TechStack {
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  nodeVersion?: string;
}

export async function detectTechStack(projectPath: string, files: SourceFile[]): Promise<TechStack> {
  const languages: string[] = [];
  if (files.some((f) => f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx'))) languages.push('TypeScript');
  if (files.some((f) => f.relativePath.endsWith('.tsx'))) languages.push('TSX');
  if (files.some((f) => f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))) languages.push('JavaScript');
  if (files.some((f) => f.relativePath.endsWith('.kt'))) languages.push('Kotlin');
  if (files.some((f) => f.relativePath.endsWith('.rs'))) languages.push('Rust');

  const frameworks: string[] = [];
  const packageJsonPath = join(projectPath, 'package.json');
  let packageManager: string | undefined;

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps.react) frameworks.push('React');
    if (deps.next) frameworks.push('Next.js');
    if (deps.vue) frameworks.push('Vue');
    if (deps['@nestjs/core']) frameworks.push('NestJS');
    if (deps.express) frameworks.push('Express');
  } catch {
    // ignore missing package.json
  }

  if (files.some((f) => f.relativePath.includes('Cargo.toml'))) frameworks.push('Rust/Cargo');

  return { languages, frameworks, packageManager };
}
```

---

## Task 2: 推荐版本 freshness 检查

**Files:**
- Create: `src/guidelines/freshness.ts`

- [ ] **Step 1: 实现 freshness 规则**

```typescript
export interface FreshnessRule {
  name: string;
  current: string;
  recommended: string;
  message: string;
}

const RECOMMENDED_VERSIONS: Record<string, string> = {
  TypeScript: '5.7',
  React: '19',
  'Next.js': '14',
  Vue: '3',
};

export function checkFreshness(frameworks: string[], detectedVersions: Record<string, string> = {}): FreshnessRule[] {
  const warnings: FreshnessRule[] = [];
  for (const fw of frameworks) {
    const recommended = RECOMMENDED_VERSIONS[fw];
    if (!recommended) continue;
    const current = detectedVersions[fw];
    if (current && !current.startsWith(recommended.split('.')[0])) {
      warnings.push({
        name: fw,
        current,
        recommended,
        message: `${fw} 当前 ${current}，建议升级到 ${recommended}+`,
      });
    }
  }
  return warnings;
}
```

---

## Task 3: Prompt 生成器

**Files:**
- Create: `src/guidelines/prompt-builder.ts`

- [ ] **Step 1: 实现 Prompt 生成**

```typescript
import type { RuleDefinition } from '../types/index.js';
import type { TechStack } from './tech-detector.js';
import type { FreshnessRule } from './freshness.js';

export interface PromptInput {
  techStack: TechStack;
  rules: RuleDefinition[];
  freshnessWarnings: FreshnessRule[];
}

export function buildSystemPrompt(input: PromptInput): string {
  const lines: string[] = [];
  lines.push('你是资深软件工程师，请严格遵守以下规范编写代码。');
  lines.push('');

  if (input.techStack.languages.length > 0) {
    lines.push(`技术栈：${input.techStack.languages.join('、')}。`);
  }
  if (input.techStack.frameworks.length > 0) {
    lines.push(`框架：${input.techStack.frameworks.join('、')}。`);
  }

  if (input.freshnessWarnings.length > 0) {
    lines.push('');
    lines.push('版本 freshness 提示：');
    for (const warning of input.freshnessWarnings) {
      lines.push(`- ${warning.message}`);
    }
  }

  lines.push('');
  lines.push('代码规范：');
  for (const rule of input.rules) {
    lines.push(`- [${rule.dimension}] ${rule.check.message}`);
  }

  return lines.join('\n');
}

export function buildCursorRules(input: PromptInput): string {
  return buildSystemPrompt(input);
}

export function buildTraeRules(input: PromptInput): string {
  return `# Project Rules\n\n${buildSystemPrompt(input)}`;
}

export function buildCopilotInstructions(input: PromptInput): string {
  return `# Copilot Instructions\n\n${buildSystemPrompt(input)}`;
}
```

---

## Task 4: 文件导出器

**Files:**
- Create: `src/guidelines/exporter.ts`

- [ ] **Step 1: 实现导出**

```typescript
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface GuidelineOutput {
  systemPrompt: string;
  cursorRules: string;
  traeRules: string;
  copilotInstructions: string;
}

export async function exportGuidelines(projectPath: string, output: GuidelineOutput): Promise<string[]> {
  const files: { path: string; content: string }[] = [
    { path: join(projectPath, '.cursorrules'), content: output.cursorRules },
    { path: join(projectPath, '.trae', 'rules', 'project_rules.md'), content: output.traeRules },
    { path: join(projectPath, '.github', 'copilot-instructions.md'), content: output.copilotInstructions },
  ];

  const written: string[] = [];
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, 'utf-8');
    written.push(file.path);
  }
  return written;
}
```

---

## Task 5: 注入器主入口

**Files:**
- Create: `src/guidelines/injector.ts`

- [ ] **Step 1: 实现主入口**

```typescript
import { scanProject } from '../core/project-scanner.js';
import { loadRulePacks } from '../core/rule-parser.js';
import { detectTechStack } from './tech-detector.js';
import { checkFreshness } from './freshness.js';
import { buildCopilotInstructions, buildCursorRules, buildSystemPrompt, buildTraeRules } from './prompt-builder.js';
import { exportGuidelines, type GuidelineOutput } from './exporter.js';

export interface InjectOptions {
  projectPath: string;
  rulePackPaths?: string[];
  writeFiles?: boolean;
}

export async function generateGuidelines(options: InjectOptions): Promise<GuidelineOutput & { writtenFiles?: string[] }> {
  const files = await scanProject(options.projectPath);
  const techStack = await detectTechStack(options.projectPath, files);
  const rulePacks = options.rulePackPaths?.length ? await loadRulePacks(options.rulePackPaths) : [];
  const rules = rulePacks.flatMap((p) => p.rules);
  const freshnessWarnings = checkFreshness(techStack.frameworks);

  const input = { techStack, rules, freshnessWarnings };
  const output: GuidelineOutput = {
    systemPrompt: buildSystemPrompt(input),
    cursorRules: buildCursorRules(input),
    traeRules: buildTraeRules(input),
    copilotInstructions: buildCopilotInstructions(input),
  };

  if (options.writeFiles) {
    const writtenFiles = await exportGuidelines(options.projectPath, output);
    return { ...output, writtenFiles };
  }

  return output;
}
```

---

## Task 6: CLI 增加 inject 命令

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: 添加 inject 命令**

```typescript
import { generateGuidelines } from './guidelines/injector.js';

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
```

---

## Task 7: 测试

**Files:**
- Create: `tests/guidelines/prompt-builder.test.ts`
- Create: `tests/guidelines/tech-detector.test.ts`

- [ ] **Step 1: prompt-builder 测试**

```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../src/guidelines/prompt-builder';
import type { RuleDefinition } from '../../src/types/index.js';

const rules: RuleDefinition[] = [
  { id: 'naming-convention', dimension: '规范', weight: 0.1, severity: 'error', check: { type: 'ast-query', message: '函数名使用 camelCase' } },
];

describe('buildSystemPrompt', () => {
  it('includes tech stack and rules', () => {
    const prompt = buildSystemPrompt({
      techStack: { languages: ['TypeScript'], frameworks: ['React'] },
      rules,
      freshnessWarnings: [],
    });
    expect(prompt).toContain('TypeScript');
    expect(prompt).toContain('camelCase');
  });
});
```

- [ ] **Step 2: tech-detector 测试**

```typescript
import { describe, it, expect } from 'vitest';
import { detectTechStack } from '../../src/guidelines/tech-detector';
import { resolve } from 'node:path';

const fixturePath = resolve(process.cwd(), 'tests/fixtures/sample-project');

describe('detectTechStack', () => {
  it('detects TypeScript from fixture', async () => {
    const stack = await detectTechStack(fixturePath, []);
    expect(stack.languages).toContain('TypeScript');
  });
});
```

---

## Task 8: 验收

- [ ] **Step 1: 类型检查与测试**

Run: `npm run typecheck && npm test -- --run`
Expected: All pass.

- [ ] **Step 2: 手动验证 inject 命令**

```bash
npx tsx src/cli.ts inject tests/fixtures/sample-project
npx tsx src/cli.ts inject tests/fixtures/sample-project --write
```

Expected: 不加 `--write` 输出 System Prompt；加 `--write` 生成 `.cursorrules`、`.trae/rules/project_rules.md`、`.github/copilot-instructions.md`。
