<div align="center">

# Code Spec Plugin

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?logo=nodedotjs)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple)](https://modelcontextprotocol.io/)

**AI 驱动的代码规范与质量治理工具**

</div>

---

Code Spec Plugin 是一款面向个人开发者与技术团队的代码质量治理工具。它通过统一的规则引擎与 LLM 评估能力，帮助你在编码早期发现问题、建立规范，并让 AI 辅助编程工具在生成代码前就遵循项目约定的最佳实践。

## 核心能力

- **智能代码评分**：从创新、规范、简洁、注释四个维度量化项目质量。
- **深度质量审计**：针对低分维度输出问题列表、优先级与重构示例。
- **写前规范注入**：根据技术栈自动生成 System Prompt 与各平台配置文件。
- **多平台适配**：CLI、MCP Server、IDE 插件、Web 应用共享同一套核心引擎。

## 快速开始

### 安装

```bash
git clone https://github.com/linruoxi666/Code-Spec-Plugin.git
cd Code-Spec-Plugin
npm install
```

### 验证

```bash
npm run typecheck
npm test
```

### 评估一个项目

```bash
npx tsx src/cli.ts evaluate tests/fixtures/sample-project
```

开启 LLM Judge（需要配置 API Key）：

```bash
cp .env.example .env
# 编辑 .env 填入 API Key 与模型信息
npx tsx src/cli.ts evaluate tests/fixtures/sample-project --llm
```

### 生成规范配置

```bash
npx tsx src/cli.ts inject tests/fixtures/sample-project --write
```

执行后会生成：

- `.trae/rules/project_rules.md`
- `.cursorrules`
- `.github/copilot-instructions.md`

## MCP Server 配置

Code Spec Plugin 可作为 MCP Server 接入 Trae、Cursor、Claude Desktop 等客户端。

```json
{
  "mcpServers": {
    "code-spec-plugin": {
      "command": "npx",
      "args": ["tsx", "/path/to/Code-Spec-Plugin/src/cli.ts", "mcp"]
    }
  }
}
```

暴露的 Tools：

- `evaluate_project(path, enableLlmJudge)`：项目评分
- `audit_file(path)`：单文件审计
- `generate_coding_guidelines(path)`：生成写前规范 Prompt

## 项目结构

```
.
├── src/
│   ├── core/         # 规则引擎、评分算法、项目扫描
│   ├── rules/        # AST 检查、指标计算、Linter 聚合
│   ├── llm/          # LLM 客户端、Judge、Prompt
│   ├── guidelines/   # 技术栈检测、Prompt 生成、配置导出
│   ├── mcp/          # MCP Server 入口
│   └── cli.ts        # CLI 入口
├── rule-packs/       # 可插拔规则包
├── tests/            # 单元测试与集成测试
└── docs/             # 设计文档与计划
```

## 开发

```bash
# 开发模式
npm run dev

# 类型检查
npm run typecheck

# 运行测试
npm test
```

## 设计文档

详细架构与模块设计见 [docs/superpowers/specs](docs/superpowers/specs/).

## 贡献

欢迎通过 Issue 和 Pull Request 参与贡献。

## License

MIT
