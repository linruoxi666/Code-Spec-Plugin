# Code Spec Plugin 设计文档

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?logo=nodedotjs)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple)](https://modelcontextprotocol.io/)

**AI 驱动的代码规范与质量治理工具**

</div>

---

## 目录

- [1. 项目定位](#1-项目定位)
- [2. 目标用户与场景](#2-目标用户与场景)
- [3. 核心功能](#3-核心功能)
  - [3.1 智能代码评分](#31-智能代码评分)
  - [3.2 深度质量审计](#32-深度质量审计)
  - [3.3 写前规范注入](#33-写前规范注入)
- [4. 整体架构](#4-整体架构)
- [5. 技术选型](#5-技术选型)
- [6. 核心模块设计](#6-核心模块设计)
  - [6.1 规则引擎](#61-规则引擎)
  - [6.2 LLM Judge](#62-llm-judge)
  - [6.3 规范注入器](#63-规范注入器)
- [7. 适配层设计](#7-适配层设计)
  - [7.1 IDE 插件](#71-ide-插件)
  - [7.2 MCP Server](#72-mcp-server)
  - [7.3 Web 应用](#73-web-应用)
- [8. 数据流](#8-数据流)
- [9. 错误处理](#9-错误处理)
- [10. 测试策略](#10-测试策略)
- [11. 可复用能力矩阵](#11-可复用能力矩阵)
- [12. 里程碑](#12-里程碑)
- [13. 非功能需求](#13-非功能需求)
- [14. 开源与贡献](#14-开源与贡献)

---

## 1. 项目定位

Code Spec Plugin 是一款面向个人开发者与技术团队的**代码质量治理工具**。它通过统一的规则引擎与 LLM 评估能力，帮助用户在编码早期发现问题、建立规范，并让 AI 辅助编程工具在生成代码前就遵循项目约定的最佳实践。

核心价值：

1. **智能代码评分**：从创新、规范、简洁、注释四个维度量化项目质量，快速定位短板。
2. **深度质量审计**：针对低分维度输出可落地的改进清单与重构示例。
3. **写前规范注入**：在 AI 开始写代码前，自动将最新技术栈与代码规范注入上下文，避免技术债累积。
4. **多平台适配**：同一套核心能力，同时以 IDE 插件、MCP Server、Web 应用三种形态输出。

---

## 2. 目标用户与场景

### 目标用户

- **个人开发者**：希望持续打磨项目质量、养成规范编码习惯。
- **技术团队**：需要统一代码规范、降低 Code Review 成本。
- **开源维护者**：希望为贡献者提供清晰的编码规范与自动化质量门禁。

### 典型场景

- 项目迭代前做一次全面质量体检，生成改进清单。
- 日常编码时让 IDE 插件实时审计并自动注入规范。
- 使用 Claude / Trae / Cherry Studio 等 AI 客户端时，通过 MCP 调用评分与规范生成能力。
- 团队新成员 onboarding 时，一键生成项目专属的开发规范文档。

---

## 3. 核心功能

### 3.1 智能代码评分

按四个维度评分，权重可配置：

| 维度 | 默认权重 | 评分方式 |
|------|---------|---------|
| 创新 | 30% | LLM Judge |
| 规范 | 30% | 规则引擎（静态分析 + Linter） |
| 简洁 | 30% | 规则引擎（复杂度、重复、文件大小） |
| 注释 | 10% | 规则引擎（注释覆盖率、文档完整性） |

### 3.2 深度质量审计

基于评分结果，针对低分维度生成：

- 问题列表（文件、行号、规则、严重程度、修复建议）。
- 改进优先级（P0 / P1 / P2）。
- 重构示例（由 LLM 针对典型问题生成前后对比代码）。

### 3.3 写前规范注入

- 根据项目技术栈自动生成 System Prompt / 配置文件。
- 支持导出为 `.trae/rules/project_rules.md`、`.cursorrules`、`.github/copilot-instructions.md`。
- IDE 插件在新建文件时自动把相关规范注入 AI 上下文。
- 规则包内置推荐技术栈版本，检测旧技术时提示升级。

---

## 4. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    适配层（Adapters）                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ IDE 插件    │  │ MCP Server  │  │ Web 应用            │ │
│  │ VSCode/Trae │  │ Claude/Trae │  │ 报告展示 + 上传项目 │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────────┼────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  统一 API 层     │
                    │  REST + JSON-RPC │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  规则引擎       │  │  LLM Judge      │  │  规范注入器     │
│ - AST 静态分析  │  │ - 结构化评分    │  │ - Prompt 模板  │
│ - Linter 聚合   │  │ - 多轮自洽      │  │ - 平台配置导出  │
│ - 安全/性能规则 │  │ - 改进建议生成  │  │ - 实时写前提示  │
└────────────────┘  └─────────────────┘  └────────────────┘
        │                    │                    │
        └────────────────────┴────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   规则包市场     │
                    │ 通用包/语言包/   │
                    │ 框架包/团队包    │
                    └─────────────────┘
```

---

## 5. 技术选型

| 层级 | 技术 |
|------|------|
| 核心引擎 | TypeScript + Node.js |
| AST 解析 | Tree-sitter |
| LLM 调用 | OpenAI-compatible API，支持 Claude / DeepSeek / 火山等 |
| 数据存储 | SQLite（本地）+ 可选 S3（Web 报告附件） |
| Web 前端 | Next.js 14 + shadcn/ui |
| MCP | 官方 TypeScript SDK |
| IDE 插件 | VS Code Extension API |

---

## 6. 核心模块设计

### 6.1 规则引擎

#### 规则包结构

```
rule-packs/
├── common/              # 通用规则
├── typescript/          # TypeScript 规则
├── react/               # React 规则
├── kotlin/              # Android/Kotlin 规则
├── rust/                # Rust 规则
└── team/                # 团队自定义规则
```

#### 单条规则格式

```json
{
  "id": "naming-convention",
  "dimension": "规范",
  "weight": 0.15,
  "severity": "error",
  "check": {
    "type": "ast-query",
    "pattern": "function_declaration[name !~ /^[a-z][a-zA-Z0-9]*$/]",
    "message": "函数名应使用 camelCase"
  }
}
```

#### 执行器职责

- **AST 检查器**：基于 Tree-sitter 执行查询。
- **Linter 聚合器**：统一 ESLint、Ruff、golangci-lint、Clippy 输出。
- **指标计算器**：圈复杂度、重复率、注释率、平均文件行数、依赖深度。

#### 输出格式

```json
{
  "dimension": "规范",
  "score": 8.2,
  "issues": [
    {
      "file": "src/api.ts",
      "line": 12,
      "rule": "naming-convention",
      "severity": "error",
      "message": "函数名应使用 camelCase"
    }
  ],
  "metrics": {
    "complexity": 12,
    "duplicateRate": 0.03,
    "commentRate": 0.15
  }
}
```

### 6.2 LLM Judge

- **输入**：规则引擎 metrics + 关键文件摘要 + 项目结构。
- **Prompt 设计**：
  - System Prompt 固化评分标准。
  - 要求按 JSON Schema 输出分数和理由。
  - 每个维度独立评分。
- **稳定性策略**：同一项目跑 3 次，取中位数；差异 >1.0 触发二次评审。
- **输出**：分数、理由、加分点、扣分点、改进建议。

### 6.3 规范注入器

- 根据技术栈组合规则，生成 System Prompt。
- 导出各平台配置文件。
- IDE 插件在文件创建时自动注入上下文。
- 技术栈 freshness 检测与升级提示。

---

## 7. 适配层设计

### 7.1 IDE 插件

- 侧边栏：项目总评分 + 雷达图。
- 文件保存时触发增量规则检查。
- 命令面板：生成规范配置、完整项目评分、生成质量报告。

### 7.2 MCP Server

暴露核心 Tools：

- `evaluate_project(path, enableLlmJudge)`：返回评分 JSON。
- `audit_file(path)`：单文件审计。
- `generate_coding_guidelines(path)`：返回 Prompt / 配置文件。

### 7.3 Web 应用

- 上传 ZIP 或输入 GitHub URL。
- 生成可分享的质量报告（雷达图、改进清单、行业均分对比）。
- 导出 PDF。

---

## 8. 数据流

1. 适配层接收请求并校验参数。
2. 识别技术栈并加载对应规则包。
3. 并行执行：
   - 静态规则引擎跑 AST / Linter。
   - LLM Judge 并行评分。
4. 按维度加权聚合生成总评分。
5. 生成改进建议、Prompt 模板、配置文件。
6. 相同项目 hash 的结果缓存 1 小时。

---

## 9. 错误处理

- 规则执行失败：记录 warning，不影响其他规则。
- LLM 超时/失败：fallback 到纯静态评分并标记置信度。
- 文件过大：自动抽样 + 大文件跳过。

---

## 10. 测试策略

- 单元测试：规则解析器、评分算法、LLM JSON 解析。
- 集成测试：5-10 个真实开源项目端到端评分。
- 快照测试：LLM Judge 输出结构快照。
- 跨平台测试：MCP 在 Claude Desktop、Trae、Cherry Studio 各跑一次。

---

## 11. 可复用能力矩阵

| 本插件模块 | 可复用 Skill / 工具 |
|-----------|-------------------|
| 通用代码审查 | `TRAE-code-review`、`simplify-code`、`requesting-code-review` |
| 安全审计 | `TRAE-security-review`、`security-best-practices` |
| Android/Kotlin | `lianyu-dev-workflow` |
| React/Next.js | `vercel-react-best-practices`、`vercel-composition-patterns` |
| React Native | `vercel-react-native-skills` |
| 系统架构 | `cybernetics-feedback-control`、`cybernetics-reliability-information` |
| 数据库 | `redis-development` |
| 调试/TDD | `TRAE-debugger`、`test-driven-development` |

---

## 12. 里程碑

| 阶段 | 目标 |
|------|------|
| M1 | 核心规则引擎 + TypeScript 规则包 + CLI 评分 |
| M2 | LLM Judge + 评分报告 |
| M3 | 规范注入器 + 配置文件导出 |
| M4 | MCP Server |
| M5 | IDE 插件 |
| M6 | Web 应用 |

---

## 13. 非功能需求

- **性能**：中型项目（1 万行代码）完整评分 < 30 秒。
- **成本**：默认使用本地静态规则，LLM 只用于必要的主观维度。
- **可扩展性**：新增规则包不需要修改引擎代码。
- **可解释性**：每条分数都有明确依据和修复建议。

---

## 14. 开源与贡献

本项目采用 MIT 协议开源，欢迎通过 Issue 和 Pull Request 参与贡献。

贡献方向：

- 新增语言/框架规则包。
- 改进 LLM Judge 的评分稳定性。
- 扩展 IDE 插件与 Web 应用功能。
- 完善文档与多语言支持。
