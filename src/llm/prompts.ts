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
