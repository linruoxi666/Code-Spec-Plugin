import { describe, it, expect } from 'vitest';
import { detectTechStack } from '../../src/guidelines/tech-detector';
import { scanProject } from '../../src/core/project-scanner';
import { resolve } from 'node:path';

const fixturePath = resolve(process.cwd(), 'tests/fixtures/sample-project');

describe('detectTechStack', () => {
  it('detects TypeScript from fixture', async () => {
    const files = await scanProject(fixturePath);
    const stack = await detectTechStack(fixturePath, files);
    expect(stack.languages).toContain('TypeScript');
  });
});
