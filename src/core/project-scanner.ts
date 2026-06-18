import { globby } from 'globby';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { SourceFile } from '../types/index.js';

export async function scanProject(projectPath: string, patterns: string[] = ['**/*.{ts,tsx,js,jsx,java,kt,go,rs,py}']): Promise<SourceFile[]> {
  const paths = await globby(patterns, {
    cwd: projectPath,
    ignore: ['node_modules', 'dist', '.git'],
    absolute: false,
  });

  const files: SourceFile[] = [];
  for (const relativePath of paths) {
    const absolutePath = join(projectPath, relativePath);
    const content = await readFile(absolutePath, 'utf-8');
    files.push({ relativePath, absolutePath, content });
  }
  return files;
}
