export function buildInnovationPrompt(projectSummary: string): string {
  return `你是一位大厂技术面试官，正在评估候选人的开源/面试项目。

请从“创新”维度对项目进行评分（0-10 分），并给出理由、加分点、扣分点和改进建议。

评分标准：
- 10 分：有原创技术思路或架构创新，解决了现有方案未解决的问题
- 7-9 分：在现有方案基础上有明显改进或组合创新
- 4-6 分：常规实现，无明显新意
- 0-3 分：复制常见教程或 demo

项目摘要：
${projectSummary}

请严格按以下 JSON 格式输出，不要包含任何额外说明：
{
  "dimension": "创新",
  "score": 8.5,
  "reason": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}`;
}

export function buildArchitecturePrompt(projectSummary: string): string {
  return `你是一位资深软件架构师，正在从“架构”维度评估候选人的开源/面试项目。

请从以下角度进行评分（0-10 分）：
- 模块化与关注点分离（单一职责、低耦合高内聚、清晰接口）
- 可扩展性（能否水平扩展、状态设计、缓存与负载均衡考虑）
- 可维护性（代码组织、一致性、可测试性、文档）
- 安全性（边界输入校验、最小权限、安全默认）
- 性能（算法效率、网络请求、数据库查询、缓存策略）

评分标准：
- 10 分：架构清晰、分层合理、具备良好扩展性与可维护性
- 7-9 分：整体良好，存在少量可改进点
- 4-6 分：基本实现，但耦合较重或扩展性不足
- 0-3 分：结构混乱、大泥球或存在严重架构反模式

项目摘要：
${projectSummary}

请严格按以下 JSON 格式输出，不要包含任何额外说明：
{
  "dimension": "架构",
  "score": 8.0,
  "reason": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}`;
}

export function buildSecurityPrompt(projectSummary: string): string {
  return `你是一位安全专家，正在从“安全”维度评估候选人的开源/面试项目。

请重点检查以下风险并评分（0-10 分）：
- 硬编码密钥、密码、token 等敏感信息
- 注入风险（SQL、命令、XSS、XEE 等）
- 认证与授权缺陷
- 用户输入校验与边界处理
- 依赖安全（已知漏洞、过期包）
- 错误信息是否泄露敏感数据

评分标准：
- 10 分：无明显安全风险，遵循安全最佳实践
- 7-9 分：整体安全，存在低风险改进点
- 4-6 分：存在一些安全隐患，需要修复
- 0-3 分：存在严重安全漏洞（如硬编码密钥、SQL 注入等）

项目摘要：
${projectSummary}

请严格按以下 JSON 格式输出，不要包含任何额外说明。vulnerabilities 为可选字段，如未发现漏洞可留空数组：
{
  "dimension": "安全",
  "score": 8.5,
  "reason": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."],
  "vulnerabilities": [
    { "severity": "CRITICAL|HIGH|MEDIUM|LOW", "description": "...", "file": "可选" }
  ]
}`;
}
