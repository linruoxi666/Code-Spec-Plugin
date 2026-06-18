import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface GuidelineOutput {
  systemPrompt: string;
  cursorRules: string;
  traeRules: string;
  copilotInstructions: string;
}

export async function exportGuidelines(projectPath: string, output: GuidelineOutput): Promise<string[]> {
  const files: { path: string; content: string }[] = [
    { path: join(projectPath, '.cursorrules'), content: output.cursorRules },
    { path: join(projectPath, '.trae', 'rules', 'project_rules.md'), content: output.traeRules },
    { path: join(projectPath, '.github', 'copilot-instructions.md'), content: output.copilotInstructions },
  ];

  const written: string[] = [];
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, 'utf-8');
    written.push(file.path);
  }
  return written;
}
