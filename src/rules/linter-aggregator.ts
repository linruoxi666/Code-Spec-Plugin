import type { Issue, RuleDefinition, SourceFile } from '../types/index.js';

export async function runLinter(files: SourceFile[], rule: RuleDefinition): Promise<Issue[]> {
  if (rule.check.type !== 'linter') return [];
  // M3 接入 ESLint / Ruff / golangci-lint 等外部 linter
  return [];
}
