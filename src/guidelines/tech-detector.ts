import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SourceFile } from '../types/index.js';

export interface TechStack {
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  nodeVersion?: string;
}

export async function detectTechStack(projectPath: string, files: SourceFile[]): Promise<TechStack> {
  const languages: string[] = [];
  if (files.some((f) => f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx'))) languages.push('TypeScript');
  if (files.some((f) => f.relativePath.endsWith('.tsx'))) languages.push('TSX');
  if (files.some((f) => f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))) languages.push('JavaScript');
  if (files.some((f) => f.relativePath.endsWith('.kt'))) languages.push('Kotlin');
  if (files.some((f) => f.relativePath.endsWith('.rs'))) languages.push('Rust');

  const frameworks: string[] = [];
  const packageJsonPath = join(projectPath, 'package.json');
  let packageManager: string | undefined;

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps.react) frameworks.push('React');
    if (deps.next) frameworks.push('Next.js');
    if (deps.vue) frameworks.push('Vue');
    if (deps['@nestjs/core']) frameworks.push('NestJS');
    if (deps.express) frameworks.push('Express');
  } catch {
    // ignore missing package.json
  }

  if (files.some((f) => f.relativePath.includes('Cargo.toml'))) frameworks.push('Rust/Cargo');

  return { languages, frameworks, packageManager };
}
