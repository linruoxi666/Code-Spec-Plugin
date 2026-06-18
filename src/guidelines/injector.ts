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
