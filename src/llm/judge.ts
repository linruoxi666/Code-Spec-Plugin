import type OpenAI from 'openai';
import { InnovationScore, InnovationScoreSchema } from './schema.js';
import { buildInnovationPrompt } from './prompts.js';
import type { SourceFile } from '../types/index.js';

export interface ProjectSummary {
  fileCount: number;
  totalLines: number;
  topLevelFiles: string[];
  keyFiles: { path: string; snippet: string }[];
  technologies: string[];
}

export function summarizeProject(files: SourceFile[]): ProjectSummary {
  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
  const topLevelFiles = Array.from(new Set(files.map((f) => f.relativePath.split('/')[0])));
  const sortedBySize = [...files].sort((a, b) => b.content.length - a.content.length).slice(0, 3);

  return {
    fileCount: files.length,
    totalLines,
    topLevelFiles,
    keyFiles: sortedBySize.map((f) => ({
      path: f.relativePath,
      snippet: f.content.slice(0, 800),
    })),
    technologies: inferTechnologies(files),
  };
}

function inferTechnologies(files: SourceFile[]): string[] {
  const techs: string[] = [];
  if (files.some((f) => f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx'))) techs.push('TypeScript');
  if (files.some((f) => f.relativePath.endsWith('.tsx'))) techs.push('React');
  if (files.some((f) => f.relativePath.includes('package.json'))) techs.push('Node.js');
  return techs;
}

export async function judgeInnovation(
  client: OpenAI,
  model: string,
  files: SourceFile[],
): Promise<InnovationScore> {
  const summary = summarizeProject(files);
  const prompt = buildInnovationPrompt(JSON.stringify(summary, null, 2));

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: '你是一个严格但公正的大厂技术面试官。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const jsonText = extractJson(content);
  const parsed = JSON.parse(jsonText);
  return InnovationScoreSchema.parse(parsed);
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : '{}';
}
