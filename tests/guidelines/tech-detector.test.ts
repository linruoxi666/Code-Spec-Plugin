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

  it('detects Java files', async () => {
    const files = await scanProject(fixturePath, ['**/*.java']);
    files.push({ relativePath: 'src/main/java/com/example/App.java', absolutePath: '/app.java', content: 'public class App {}' });
    const stack = await detectTechStack(fixturePath, files);
    expect(stack.languages).toContain('Java');
  });

  it('detects Kotlin files', async () => {
    const files = await scanProject(fixturePath, ['**/*.kt']);
    files.push({ relativePath: 'App.kt', absolutePath: '/App.kt', content: 'class App' });
    const stack = await detectTechStack(fixturePath, files);
    expect(stack.languages).toContain('Kotlin');
  });

  it('detects Go files', async () => {
    const files = await scanProject(fixturePath, ['**/*.go']);
    files.push({ relativePath: 'main.go', absolutePath: '/main.go', content: 'package main\nfunc main() {}' });
    const stack = await detectTechStack(fixturePath, files);
    expect(stack.languages).toContain('Go');
  });

  it('detects Python files', async () => {
    const files = await scanProject(fixturePath, ['**/*.py']);
    files.push({ relativePath: 'app.py', absolutePath: '/app.py', content: 'def main():\n    pass' });
    const stack = await detectTechStack(fixturePath, files);
    expect(stack.languages).toContain('Python');
  });

  it('detects Rust files', async () => {
    const files = await scanProject(fixturePath, ['**/*.rs']);
    files.push({ relativePath: 'main.rs', absolutePath: '/main.rs', content: 'fn main() {}' });
    const stack = await detectTechStack(fixturePath, files);
    expect(stack.languages).toContain('Rust');
  });
});
