# Code Spec Web Dashboard

本地运行的 Web 仪表盘，用于对本地项目执行代码质量评分、查看历史记录和对比结果。

## 功能

- **项目评分**：输入本地项目路径，一键调用 `csi evaluate` 跑分
- **LLM Judge 开关**：可选择是否启用 LLM 维度评分
- **历史记录**：每次评分自动保存到本地 `~/.code-spec/web/history.json`
- **对比分析**：选择任意两次记录对比各维度得分
- **问题列表**：展示当前评分的具体问题

## 开发

```bash
cd web
npm install
npm run dev
```

浏览器访问 http://localhost:8080，后端 API 在 http://localhost:3000。

## 生产构建

```bash
cd web
npm run build
npm start
```

访问 http://localhost:3000。

## 注意事项

- 开发时后端默认通过 `npx tsx ../src/cli.ts` 调用 CLI，无需全局安装
- 生产环境可设置环境变量 `CODE_SPEC_CLI_PATH` 指向 `csi` 可执行文件
