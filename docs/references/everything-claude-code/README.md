# everything-claude-code 参考源码

本目录收录 [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) 中可直接参考或改编的源码/配置。

原项目许可证：MIT。

## 收录内容

| 文件 | 来源 | 用途 |
|---|---|---|
| `AGENTS.md` | 原项目根目录 | Agent 目录与编排规范 |
| `RULES.md` | 原项目根目录 | 通用规则与约束 |
| `agents/architect.md` | `agents/architect.md` | 架构评估 Agent prompt |
| `agents/code-reviewer.md` | `agents/code-reviewer.md` | 代码审查 Agent prompt |
| `agents/security-reviewer.md` | `agents/security-reviewer.md` | 安全审查 Agent prompt |

## 使用方式

这些文件仅作参考与署名保留。项目已将其中可复用的思想吸收到 `src/llm/prompts.ts`、`src/llm/judge.ts` 及 rule-packs 中，转换为可执行的 TypeScript 代码与 JSON 规则。
