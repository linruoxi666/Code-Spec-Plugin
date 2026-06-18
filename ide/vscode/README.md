# Code Spec Plugin for VS Code

在 VS Code 中直接对当前工作区执行代码规范评分。

## 功能

- **Code Spec: Evaluate Project** — 对当前工作区执行 `csi evaluate`，在输出面板展示完整 JSON 报告。
- **Code Spec: Generate HTML Report** — 执行 `csi evaluate --report code-spec-report.html` 并自动打开报告。

## 配置

在 VS Code 设置中搜索 `codeSpec`：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `codeSpec.cliPath` | Code Spec CLI 路径 | `csi` |
| `codeSpec.enableLlmJudge` | 是否启用 LLM Judge | `false` |

## 开发

```bash
cd ide/vscode
npm install
npm run compile
```

按 `F5` 可在 Extension Host 中调试。

## 打包发布

```bash
npm install -g @vscode/vsce
vsce package
```
