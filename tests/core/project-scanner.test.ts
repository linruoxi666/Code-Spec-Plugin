import { describe, it, expect } from 'vitest';
import { scanProject } from '../../src/core/project-scanner';
import { resolve } from 'node:path';

const fixturePath = resolve(process.cwd(), 'tests/fixtures/sample-project');

describe('scanProject', () => {
  it('should scan ts files excluding node_modules', async () => {
    const files = await scanProject(fixturePath);
    const names = files.map((f) => f.relativePath).sort();
    expect(names).toEqual(['src/bad.ts', 'src/good.ts']);
  });
});
