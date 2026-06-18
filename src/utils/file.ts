import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function readProjectFile(projectPath: string, relativePath: string): Promise<string> {
  const fullPath = resolve(projectPath, relativePath);
  return readFile(fullPath, 'utf-8');
}
