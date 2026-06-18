# M1：核心规则引擎 + CLI 评分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成可独立运行的核心规则引擎与 CLI，支持扫描 TypeScript 项目并按“规范 / 简洁 / 注释”维度输出评分与问题列表。

**Architecture:** 采用可插拔规则包设计。`RuleEngine` 负责加载规则包、执行检查、聚合指标；`Scorer` 根据权重计算维度得分；CLI 作为入口接收项目路径并输出 JSON 报告。

**Tech Stack:** TypeScript 5.7、Node.js 20、Tree-sitter、Vitest、tsx

---

## 文件结构

```
.
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── core/
│   │   ├── project-scanner.ts
│   │   ├── rule-parser.ts
│   │   ├── rule-executor.ts
│   │   ├── rule-engine.ts
│   │   ├── metrics-aggregator.ts
│   │   └── scorer.ts
│   ├── rules/
│   │   ├── ast-checker.ts
│   │   ├── linter-aggregator.ts
│   │   └── metric-calculator.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── file.ts
│   └── cli.ts
├── rule-packs/
│   ├── common/
│   │   └── README.json
│   └── typescript/
│       ├── naming-convention.json
│       └── comment-coverage.json
└── tests/
    ├── fixtures/
    │   └── sample-project/
    │       ├── src/
    │       │   ├── good.ts
    │       │   └── bad.ts
    │       └── package.json
    ├── core/
    │   ├── rule-engine.test.ts
    │   └── scorer.test.ts
    └── rules/
        └── ast-checker.test.ts
```

---

## Task 1: 初始化项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: 写入 package.json**

```json
{
  "name": "code-spec-interview-plugin",
  "version": "0.1.0",
  "description": "One-stop code quality evaluator and pre-coding guideline injector for big-tech interviews.",
  "type": "module",
  "scripts": {
    "dev": "tsx src/cli.ts",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "echo 'eslint setup in M3'"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "tree-sitter": "^0.21.1",
    "tree-sitter-typescript": "^0.21.2",
    "globby": "^14.0.2"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 写入 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 写入 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: 写入 .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
.env
```

- [ ] **Step 5: 安装依赖**

Run: `npm install`
Expected: `node_modules` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore

git commit -m "chore: init project with typescript, vitest, tree-sitter"
```

---

## Task 2: 定义核心类型

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 写入类型文件**

```typescript
export type Dimension = '创新' | '规范' | '简洁' | '注释';

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  severity: Severity;
  message: string;
}

export interface MetricValue {
  name: string;
  value: number;
  unit?: string;
}

export interface DimensionResult {
  dimension: Dimension;
  score: number;
  issues: Issue[];
  metrics: MetricValue[];
}

export interface RuleCheck {
  type: 'ast-query' | 'metric' | 'linter';
  pattern?: string;
  message: string;
  threshold?: number;
}

export interface RuleDefinition {
  id: string;
  dimension: Dimension;
  weight: number;
  severity: Severity;
  check: RuleCheck;
}

export interface RulePack {
  name: string;
  language?: string;
  rules: RuleDefinition[];
}

export interface EvaluateOptions {
  projectPath: string;
  rulePackPaths?: string[];
  weights?: Partial<Record<Dimension, number>>;
}

export interface EvaluateReport {
  totalScore: number;
  dimensions: DimensionResult[];
  issues: Issue[];
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts

git commit -m "feat: add core type definitions"
```

---

## Task 3: 项目扫描器

**Files:**
- Create: `src/core/project-scanner.ts`
- Create: `src/utils/file.ts`

- [ ] **Step 1: 写入文件工具**

```typescript
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function readProjectFile(projectPath: string, relativePath: string): Promise<string> {
  const fullPath = resolve(projectPath, relativePath);
  return readFile(fullPath, 'utf-8');
}
```

- [ ] **Step 2: 写入项目扫描器**

```typescript
import { globby } from 'globby';

export interface SourceFile {
  relativePath: string;
  absolutePath: string;
  content: string;
}

export async function scanProject(projectPath: string, patterns: string[] = ['**/*.{ts,tsx,js,jsx}']): Promise<SourceFile[]> {
  const paths = await globby(patterns, {
    cwd: projectPath,
    ignore: ['node_modules', 'dist', '.git'],
    absolute: false,
  });

  const files: SourceFile[] = [];
  for (const relativePath of paths) {
    const absolutePath = `${projectPath}/${relativePath}`;
    const content = await (await import('node:fs/promises')).readFile(absolutePath, 'utf-8');
    files.push({ relativePath, absolutePath, content });
  }
  return files;
}
```

- [ ] **Step 3: 写测试**

Create: `tests/core/project-scanner.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { scanProject } from '../../src/core/project-scanner';
import { resolve } from 'node:path';

const fixturePath = resolve(process.cwd(), 'tests/fixtures/sample-project');

describe('scanProject', () => {
  it('should scan ts files excluding node_modules', async () => {
    const files = await scanProject(fixturePath);
    const names = files.map((f) => f.relativePath).sort();
    expect(names).toEqual(['src/bad.ts', 'src/good.ts']);
  });
});
```

- [ ] **Step 4: 创建 fixture**

Create: `tests/fixtures/sample-project/src/good.ts`

```typescript
/**
 * Calculates the sum of two numbers.
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

Create: `tests/fixtures/sample-project/src/bad.ts`

```typescript
export function BAD_FUNCTION(x: any, y: any) {
  return x + y;
}
```

Create: `tests/fixtures/sample-project/package.json`

```json
{
  "name": "sample-project",
  "version": "1.0.0"
}
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest tests/core/project-scanner.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/file.ts src/core/project-scanner.ts tests/core/project-scanner.test.ts tests/fixtures/sample-project/

git commit -m "feat: add project scanner with fixture"
```

---

## Task 4: AST 检查器（Tree-sitter）

**Files:**
- Create: `src/rules/ast-checker.ts`

- [ ] **Step 1: 写入 AST 检查器**

```typescript
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import type { Issue, RuleDefinition, SourceFile } from '../types/index.js';

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

export function checkAst(files: SourceFile[], rule: RuleDefinition): Issue[] {
  if (rule.check.type !== 'ast-query') return [];

  const issues: Issue[] = [];
  for (const file of files) {
    if (!file.relativePath.endsWith('.ts') && !file.relativePath.endsWith('.tsx')) continue;

    const tree = parser.parse(file.content);
    const root = tree.rootNode;

    if (rule.id === 'naming-convention') {
      const functions = root.descendantsOfType('function_declaration');
      for (const fn of functions) {
        const nameNode = fn.childForFieldName('name');
        if (!nameNode) continue;
        const name = nameNode.text;
        if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
          issues.push({
            file: file.relativePath,
            line: nameNode.startPosition.row + 1,
            column: nameNode.startPosition.column + 1,
            rule: rule.id,
            severity: rule.severity,
            message: `${rule.check.message}: ${name}`,
          });
        }
      }
    }
  }
  return issues;
}
```

- [ ] **Step 2: 写测试**

Create: `tests/rules/ast-checker.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { checkAst } from '../../src/rules/ast-checker';
import type { RuleDefinition, SourceFile } from '../../src/types/index.js';

const rule: RuleDefinition = {
  id: 'naming-convention',
  dimension: '规范',
  weight: 0.15,
  severity: 'error',
  check: {
    type: 'ast-query',
    message: '函数名应使用 camelCase',
  },
};

const files: SourceFile[] = [
  {
    relativePath: 'good.ts',
    absolutePath: '/good.ts',
    content: 'export function addOne(x: number): number { return x + 1; }',
  },
  {
    relativePath: 'bad.ts',
    absolutePath: '/bad.ts',
    content: 'export function BAD_FUNCTION(x: any, y: any) { return x + y; }',
  },
];

describe('checkAst', () => {
  it('detects non-camelCase function names', () => {
    const issues = checkAst(files, rule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.ts');
    expect(issues[0].message).toContain('BAD_FUNCTION');
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest tests/rules/ast-checker.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/rules/ast-checker.ts tests/rules/ast-checker.test.ts

git commit -m "feat: add tree-sitter based AST checker for naming convention"
```

---

## Task 5: 指标计算器

**Files:**
- Create: `src/rules/metric-calculator.ts`

- [ ] **Step 1: 写入指标计算器**

```typescript
import type { Issue, MetricValue, RuleDefinition, SourceFile } from '../types/index.js';

export function calculateMetrics(files: SourceFile[], rule: RuleDefinition): { issues: Issue[]; metrics: MetricValue[] } {
  if (rule.check.type !== 'metric') return { issues: [], metrics: [] };

  if (rule.id === 'comment-coverage') {
    const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const commentLines = files.reduce((sum, f) => {
      const matches = f.content.match(/(\/\/.*|\/\*[\s\S]*?\*\/)/g);
      return sum + (matches ? matches.length : 0);
    }, 0);
    const coverage = totalLines === 0 ? 0 : commentLines / totalLines;
    const threshold = rule.check.threshold ?? 0.1;
    const issues: Issue[] = [];
    if (coverage < threshold) {
      issues.push({
        file: 'project',
        rule: rule.id,
        severity: rule.severity,
        message: `注释覆盖率 ${(coverage * 100).toFixed(1)}% 低于阈值 ${(threshold * 100).toFixed(0)}%`,
      });
    }
    return {
      issues,
      metrics: [{ name: 'commentCoverage', value: coverage, unit: 'ratio' }],
    };
  }

  if (rule.id === 'file-length') {
    const issues: Issue[] = [];
    const threshold = rule.check.threshold ?? 300;
    for (const file of files) {
      const lines = file.content.split('\n').length;
      if (lines > threshold) {
        issues.push({
          file: file.relativePath,
          rule: rule.id,
          severity: rule.severity,
          message: `文件 ${lines} 行，超过 ${threshold} 行限制`,
        });
      }
    }
    return { issues, metrics: [] };
  }

  return { issues: [], metrics: [] };
}
```

- [ ] **Step 2: 写测试**

Create: `tests/rules/metric-calculator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '../../src/rules/metric-calculator';
import type { RuleDefinition, SourceFile } from '../../src/types/index.js';

const commentRule: RuleDefinition = {
  id: 'comment-coverage',
  dimension: '注释',
  weight: 0.1,
  severity: 'warning',
  check: { type: 'metric', message: '注释覆盖率不足', threshold: 0.1 },
};

const fileRule: RuleDefinition = {
  id: 'file-length',
  dimension: '简洁',
  weight: 0.1,
  severity: 'warning',
  check: { type: 'metric', message: '文件过长', threshold: 10 },
};

const files: SourceFile[] = [
  { relativePath: 'a.ts', absolutePath: '/a.ts', content: '// comment\nconst a = 1;\n' },
  { relativePath: 'b.ts', absolutePath: '/b.ts', content: 'const b = 2;\n'.repeat(20) },
];

describe('calculateMetrics', () => {
  it('checks comment coverage', () => {
    const result = calculateMetrics(files, commentRule);
    expect(result.metrics[0].value).toBeGreaterThan(0);
  });

  it('detects long files', () => {
    const result = calculateMetrics(files, fileRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('b.ts');
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest tests/rules/metric-calculator.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/rules/metric-calculator.ts tests/rules/metric-calculator.test.ts

git commit -m "feat: add metric calculator for comment coverage and file length"
```

---

## Task 6: Linter 聚合器（占位实现）

**Files:**
- Create: `src/rules/linter-aggregator.ts`

- [ ] **Step 1: 写入占位实现**

```typescript
import type { Issue, RuleDefinition, SourceFile } from '../types/index.js';

export async function runLinter(files: SourceFile[], rule: RuleDefinition): Promise<Issue[]> {
  if (rule.check.type !== 'linter') return [];
  // M3 接入 ESLint / Ruff / golangci-lint 等外部 linter
  return [];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/rules/linter-aggregator.ts

git commit -m "chore: stub linter aggregator for M3"
```

---

## Task 7: 规则解析器

**Files:**
- Create: `src/core/rule-parser.ts`

- [ ] **Step 1: 写入规则解析器**

```typescript
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { RuleDefinition, RulePack } from '../types/index.js';

export async function loadRulePack(rulePackPath: string): Promise<RulePack> {
  const files = await readdir(rulePackPath);
  const rules: RuleDefinition[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const content = await readFile(join(rulePackPath, file), 'utf-8');
    const rule = JSON.parse(content) as RuleDefinition;
    rules.push(rule);
  }

  const name = rulePackPath.split(/[\\/]/).pop() ?? 'unknown';
  return { name, rules };
}

export async function loadRulePacks(paths: string[]): Promise<RulePack[]> {
  return Promise.all(paths.map(loadRulePack));
}
```

- [ ] **Step 2: 写测试**

Create: `tests/core/rule-parser.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { loadRulePack } from '../../src/core/rule-parser';
import { resolve } from 'node:path';

const packPath = resolve(process.cwd(), 'rule-packs/typescript');

describe('loadRulePack', () => {
  it('loads typescript rules', async () => {
    const pack = await loadRulePack(packPath);
    expect(pack.rules.length).toBeGreaterThan(0);
    expect(pack.rules[0]).toHaveProperty('id');
    expect(pack.rules[0]).toHaveProperty('dimension');
  });
});
```

- [ ] **Step 3: 创建 TypeScript 规则包**

Create: `rule-packs/typescript/naming-convention.json`

```json
{
  "id": "naming-convention",
  "dimension": "规范",
  "weight": 0.15,
  "severity": "error",
  "check": {
    "type": "ast-query",
    "message": "函数名应使用 camelCase"
  }
}
```

Create: `rule-packs/typescript/comment-coverage.json`

```json
{
  "id": "comment-coverage",
  "dimension": "注释",
  "weight": 0.1,
  "severity": "warning",
  "check": {
    "type": "metric",
    "message": "注释覆盖率不足",
    "threshold": 0.1
  }
}
```

Create: `rule-packs/typescript/file-length.json`

```json
{
  "id": "file-length",
  "dimension": "简洁",
  "weight": 0.1,
  "severity": "warning",
  "check": {
    "type": "metric",
    "message": "文件过长",
    "threshold": 300
  }
}
```

Create: `rule-packs/common/README.json`

```json
{
  "id": "readme-required",
  "dimension": "规范",
  "weight": 0.05,
  "severity": "error",
  "check": {
    "type": "metric",
    "message": "项目缺少 README.md"
  }
}
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest tests/core/rule-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/rule-parser.ts tests/core/rule-parser.test.ts rule-packs/

git commit -m "feat: add rule parser and typescript/common rule packs"
```

---

## Task 8: 规则执行器与规则引擎

**Files:**
- Create: `src/core/rule-executor.ts`
- Create: `src/core/rule-engine.ts`

- [ ] **Step 1: 写入规则执行器**

```typescript
import { checkAst } from '../rules/ast-checker.js';
import { calculateMetrics } from '../rules/metric-calculator.js';
import { runLinter } from '../rules/linter-aggregator.js';
import type { Issue, MetricValue, RuleDefinition, SourceFile } from '../types/index.js';

export async function executeRule(files: SourceFile[], rule: RuleDefinition): Promise<{ issues: Issue[]; metrics: MetricValue[] }> {
  switch (rule.check.type) {
    case 'ast-query':
      return { issues: checkAst(files, rule), metrics: [] };
    case 'metric':
      return calculateMetrics(files, rule);
    case 'linter':
      return { issues: await runLinter(files, rule), metrics: [] };
    default:
      return { issues: [], metrics: [] };
  }
}
```

- [ ] **Step 2: 写入规则引擎**

```typescript
import { scanProject } from './project-scanner.js';
import { loadRulePacks } from './rule-parser.js';
import { executeRule } from './rule-executor.js';
import type { EvaluateOptions, EvaluateReport, Issue, MetricValue, RulePack } from '../types/index.js';

export async function evaluateProject(options: EvaluateOptions): Promise<EvaluateReport> {
  const files = await scanProject(options.projectPath);
  const rulePacks = options.rulePackPaths?.length
    ? await loadRulePacks(options.rulePackPaths)
    : [];

  const allIssues: Issue[] = [];
  const allMetrics: MetricValue[] = [];

  for (const pack of rulePacks) {
    for (const rule of pack.rules) {
      const result = await executeRule(files, rule);
      allIssues.push(...result.issues);
      allMetrics.push(...result.metrics);
    }
  }

  // M1 先输出 issues 和 metrics，不计算最终加权总分
  return {
    totalScore: 0,
    dimensions: [],
    issues: allIssues,
  };
}
```

- [ ] **Step 3: 写测试**

Create: `tests/core/rule-engine.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateProject } from '../../src/core/rule-engine';
import { resolve } from 'node:path';

const fixturePath = resolve(process.cwd(), 'tests/fixtures/sample-project');
const typescriptPack = resolve(process.cwd(), 'rule-packs/typescript');

describe('evaluateProject', () => {
  it('detects naming and comment issues in sample project', async () => {
    const report = await evaluateProject({
      projectPath: fixturePath,
      rulePackPaths: [typescriptPack],
    });
    const namingIssues = report.issues.filter((i) => i.rule === 'naming-convention');
    expect(namingIssues.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest tests/core/rule-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/rule-executor.ts src/core/rule-engine.ts tests/core/rule-engine.test.ts

git commit -m "feat: add rule executor and engine"
```

---

## Task 9: 评分算法

**Files:**
- Create: `src/core/scorer.ts`
- Modify: `src/core/rule-engine.ts`

- [ ] **Step 1: 写入评分算法**

```typescript
import type { Dimension, DimensionResult, Issue, MetricValue, RuleDefinition } from '../types/index.js';

const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  创新: 0.3,
  规范: 0.3,
  简洁: 0.3,
  注释: 0.1,
};

export function scoreDimensions(
  rules: RuleDefinition[],
  issues: Issue[],
  metrics: MetricValue[],
  weights: Record<Dimension, number> = DEFAULT_WEIGHTS,
): DimensionResult[] {
  const dimensions: Dimension[] = ['创新', '规范', '简洁', '注释'];

  return dimensions.map((dimension) => {
    const dimensionRules = rules.filter((r) => r.dimension === dimension);
    const dimensionIssues = issues.filter((i) => dimensionRules.some((r) => r.id === i.rule));

    let score = 10;
    for (const rule of dimensionRules) {
      const ruleIssues = dimensionIssues.filter((i) => i.rule === rule.id);
      const penalty = ruleIssues.length * (rule.severity === 'error' ? 1.5 : rule.severity === 'warning' ? 0.8 : 0.3);
      score -= penalty * rule.weight * 10;
    }

    const dimensionMetrics = metrics.filter((m) =>
      dimensionRules.some((r) => r.id.includes(m.name.toLowerCase())),
    );

    return {
      dimension,
      score: Math.max(0, Math.min(10, score)),
      issues: dimensionIssues,
      metrics: dimensionMetrics,
    };
  });
}

export function calculateTotalScore(dimensions: DimensionResult[], weights: Record<Dimension, number> = DEFAULT_WEIGHTS): number {
  return dimensions.reduce((sum, d) => sum + d.score * weights[d.dimension], 0);
}
```

- [ ] **Step 2: 写测试**

Create: `tests/core/scorer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { scoreDimensions, calculateTotalScore } from '../../src/core/scorer';
import type { Issue, MetricValue, RuleDefinition } from '../../src/types/index.js';

const rules: RuleDefinition[] = [
  { id: 'naming-convention', dimension: '规范', weight: 0.5, severity: 'error', check: { type: 'ast-query', message: '' } },
  { id: 'comment-coverage', dimension: '注释', weight: 1.0, severity: 'warning', check: { type: 'metric', message: '' } },
];

const issues: Issue[] = [
  { file: 'a.ts', rule: 'naming-convention', severity: 'error', message: 'bad name' },
  { file: 'b.ts', rule: 'comment-coverage', severity: 'warning', message: 'low coverage' },
];

const metrics: MetricValue[] = [{ name: 'commentCoverage', value: 0.05, unit: 'ratio' }];

describe('scoreDimensions', () => {
  it('calculates scores by dimension', () => {
    const results = scoreDimensions(rules, issues, metrics);
    const norm = results.find((r) => r.dimension === '规范');
    expect(norm!.score).toBeLessThan(10);
    expect(norm!.issues.length).toBe(1);
  });
});

describe('calculateTotalScore', () => {
  it('returns weighted total', () => {
    const dims = scoreDimensions(rules, issues, metrics);
    const total = calculateTotalScore(dims);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(10);
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest tests/core/scorer.test.ts`
Expected: PASS

- [ ] **Step 4: 修改 rule-engine.ts 使用 scorer**

Replace the return block in `evaluateProject` with:

```typescript
import { calculateTotalScore, scoreDimensions } from './scorer.js';

// ... inside evaluateProject
const allRules = rulePacks.flatMap((p) => p.rules);
const dimensions = scoreDimensions(allRules, allIssues, allMetrics, options.weights as Record<Dimension, number>);
const totalScore = calculateTotalScore(dimensions, options.weights as Record<Dimension, number>);

return {
  totalScore,
  dimensions,
  issues: allIssues,
};
```

- [ ] **Step 5: 更新 rule-engine 测试验证总分**

Add to `tests/core/rule-engine.test.ts`:

```typescript
expect(report.totalScore).toBeGreaterThan(0);
expect(report.totalScore).toBeLessThan(10);
expect(report.dimensions.length).toBe(4);
```

- [ ] **Step 6: 运行全部测试**

Run: `npm test`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/core/scorer.ts tests/core/scorer.test.ts src/core/rule-engine.ts tests/core/rule-engine.test.ts

git commit -m "feat: add dimension scoring algorithm and integrate into engine"
```

---

## Task 10: CLI 入口

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: 写入 CLI**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { evaluateProject } from './core/rule-engine.js';
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
  .action(async (projectPath: string, options: { rules?: string[] }) => {
    const absolutePath = resolve(projectPath);
    const rulePackPaths = options.rules?.map((p) => resolve(p)) ?? [
      resolve(process.cwd(), 'rule-packs/common'),
      resolve(process.cwd(), 'rule-packs/typescript'),
    ];

    const report = await evaluateProject({ projectPath: absolutePath, rulePackPaths });
    console.log(JSON.stringify(report, null, 2));
  });

program.parse();
```

- [ ] **Step 2: 本地运行 CLI**

Run: `npx tsx src/cli.ts evaluate tests/fixtures/sample-project`
Expected: 输出 JSON 报告，包含 totalScore、dimensions、issues。

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts

git commit -m "feat: add CLI entrypoint for project evaluation"
```

---

## Task 11: README 与 M1 验收

**Files:**
- Create: `README.md`

- [ ] **Step 1: 写入 README**

```markdown
# Code Spec Interview Plugin

大厂面试一站式代码质量评估与写前规范注入插件。

## M1 能力

- 扫描 TypeScript 项目文件
- 按“规范 / 简洁 / 注释”维度自动评分
- 输出 JSON 报告（总分、维度分、问题列表）
- CLI 入口 `csi evaluate <path>`

## 快速开始

```bash
npm install
npm run typecheck
npm test
npx tsx src/cli.ts evaluate tests/fixtures/sample-project
```

## 架构

- `src/core/`：规则引擎、评分算法
- `src/rules/`：AST 检查、指标计算、Linter 聚合
- `rule-packs/`：可插拔规则包
```

- [ ] **Step 2: 运行最终检查**

Run:
```bash
npm run typecheck
npm test
```
Expected: No type errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add README.md

git commit -m "docs: add M1 README"
```

---

## Spec Coverage Check

| Spec 需求 | 对应 Task |
|-----------|----------|
| 可插拔规则包设计 | Task 7 |
| AST 静态分析 | Task 4 |
| Linter 聚合占位 | Task 6 |
| 指标计算 | Task 5 |
| 评分算法 | Task 9 |
| CLI 入口 | Task 10 |
| 多平台基础核心 | M1 全部 |

LLM Judge、规范注入器、MCP Server、IDE 插件、Web 应用将在 M2-M6 实现。
