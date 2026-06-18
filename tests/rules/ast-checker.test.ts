import { describe, it, expect } from 'vitest';
import { checkAst } from '../../src/rules/ast-checker';
import type { RuleDefinition, SourceFile } from '../../src/types/index.js';

const rule: RuleDefinition = {
  id: 'naming-convention',
  dimension: '规范',
  weight: 0.15,
  severity: 'error',
  check: {
    type: 'ast-query',
    message: '函数名应使用 camelCase',
  },
};

const files: SourceFile[] = [
  {
    relativePath: 'good.ts',
    absolutePath: '/good.ts',
    content: 'export function addOne(x: number): number { return x + 1; }',
  },
  {
    relativePath: 'bad.ts',
    absolutePath: '/bad.ts',
    content: 'export function BAD_FUNCTION(x: any, y: any) { return x + y; }',
  },
];

describe('checkAst', () => {
  it('detects non-camelCase function names', () => {
    const issues = checkAst(files, rule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.ts');
    expect(issues[0].message).toContain('BAD_FUNCTION');
  });

  it('detects hardcoded secrets', () => {
    const secretRule: RuleDefinition = {
      id: 'no-hardcoded-secrets',
      dimension: '安全',
      weight: 0.3,
      severity: 'error',
      check: { type: 'ast-query', message: '发现疑似硬编码敏感信息' },
    };
    const secretFiles: SourceFile[] = [
      {
        relativePath: 'config.ts',
        absolutePath: '/config.ts',
        content: 'const apiKey = "sk-abc123xyz789secret";\nconst valid = "ok";',
      },
    ];
    const issues = checkAst(secretFiles, secretRule);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].rule).toBe('no-hardcoded-secrets');
  });

  it('detects Java class naming violations', () => {
    const javaRule: RuleDefinition = {
      id: 'java-class-naming',
      dimension: '规范',
      weight: 0.15,
      severity: 'error',
      check: { type: 'ast-query', message: 'Java 类名应使用 PascalCase' },
    };
    const javaFiles: SourceFile[] = [
      {
        relativePath: 'badClass.java',
        absolutePath: '/badClass.java',
        content: 'public class badClass { }',
      },
      {
        relativePath: 'GoodClass.java',
        absolutePath: '/GoodClass.java',
        content: 'public class GoodClass { }',
      },
    ];
    const issues = checkAst(javaFiles, javaRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('badClass.java');
    expect(issues[0].message).toContain('badClass');
  });

  it('detects Java method naming violations', () => {
    const javaRule: RuleDefinition = {
      id: 'java-method-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Java 方法名应使用 camelCase' },
    };
    const javaFiles: SourceFile[] = [
      {
        relativePath: 'Demo.java',
        absolutePath: '/Demo.java',
        content: 'public class Demo { public void BAD_METHOD() {} public void goodMethod() {} }',
      },
    ];
    const issues = checkAst(javaFiles, javaRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('BAD_METHOD');
  });

  it('detects Go function naming violations', () => {
    const goRule: RuleDefinition = {
      id: 'go-function-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Go 函数名应使用 camelCase' },
    };
    const goFiles: SourceFile[] = [
      { relativePath: 'good.go', absolutePath: '/good.go', content: 'package main\nfunc goodFunc() {}' },
      { relativePath: 'bad.go', absolutePath: '/bad.go', content: 'package main\nfunc BadFunc() {}' },
    ];
    const issues = checkAst(goFiles, goRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.go');
    expect(issues[0].message).toContain('BadFunc');
  });

  it('detects Go type naming violations', () => {
    const goRule: RuleDefinition = {
      id: 'go-type-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Go 类型名应使用 PascalCase' },
    };
    const goFiles: SourceFile[] = [
      { relativePath: 'good.go', absolutePath: '/good.go', content: 'package main\ntype Good struct {}' },
      { relativePath: 'bad.go', absolutePath: '/bad.go', content: 'package main\ntype badStruct struct {}' },
    ];
    const issues = checkAst(goFiles, goRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.go');
    expect(issues[0].message).toContain('badStruct');
  });

  it('detects Rust function naming violations', () => {
    const rustRule: RuleDefinition = {
      id: 'rust-function-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Rust 函数名应使用 snake_case' },
    };
    const rustFiles: SourceFile[] = [
      { relativePath: 'good.rs', absolutePath: '/good.rs', content: 'fn good_func() {}' },
      { relativePath: 'bad.rs', absolutePath: '/bad.rs', content: 'fn badFunc() {}' },
    ];
    const issues = checkAst(rustFiles, rustRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.rs');
    expect(issues[0].message).toContain('badFunc');
  });

  it('detects Rust struct naming violations', () => {
    const rustRule: RuleDefinition = {
      id: 'rust-struct-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Rust 结构体名应使用 PascalCase' },
    };
    const rustFiles: SourceFile[] = [
      { relativePath: 'good.rs', absolutePath: '/good.rs', content: 'struct GoodStruct {}' },
      { relativePath: 'bad.rs', absolutePath: '/bad.rs', content: 'struct badStruct {}' },
    ];
    const issues = checkAst(rustFiles, rustRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.rs');
    expect(issues[0].message).toContain('badStruct');
  });

  it('detects Python function naming violations', () => {
    const pyRule: RuleDefinition = {
      id: 'python-function-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Python 函数名应使用 snake_case' },
    };
    const pyFiles: SourceFile[] = [
      { relativePath: 'good.py', absolutePath: '/good.py', content: 'def good_func():\n    pass' },
      { relativePath: 'bad.py', absolutePath: '/bad.py', content: 'def badFunc():\n    pass' },
    ];
    const issues = checkAst(pyFiles, pyRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.py');
    expect(issues[0].message).toContain('badFunc');
  });

  it('detects Python class naming violations', () => {
    const pyRule: RuleDefinition = {
      id: 'python-class-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Python 类名应使用 PascalCase' },
    };
    const pyFiles: SourceFile[] = [
      { relativePath: 'good.py', absolutePath: '/good.py', content: 'class GoodClass:\n    pass' },
      { relativePath: 'bad.py', absolutePath: '/bad.py', content: 'class badClass:\n    pass' },
    ];
    const issues = checkAst(pyFiles, pyRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('bad.py');
    expect(issues[0].message).toContain('badClass');
  });

  it('detects Kotlin class naming violations', () => {
    const ktRule: RuleDefinition = {
      id: 'kotlin-class-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Kotlin 类名应使用 PascalCase' },
    };
    const ktFiles: SourceFile[] = [
      { relativePath: 'Good.kt', absolutePath: '/Good.kt', content: 'class GoodClass' },
      { relativePath: 'Bad.kt', absolutePath: '/Bad.kt', content: 'class badClass' },
    ];
    const issues = checkAst(ktFiles, ktRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('Bad.kt');
    expect(issues[0].message).toContain('badClass');
  });

  it('detects Kotlin function naming violations', () => {
    const ktRule: RuleDefinition = {
      id: 'kotlin-function-naming',
      dimension: '规范',
      weight: 0.1,
      severity: 'error',
      check: { type: 'ast-query', message: 'Kotlin 函数名应使用 camelCase' },
    };
    const ktFiles: SourceFile[] = [
      { relativePath: 'Good.kt', absolutePath: '/Good.kt', content: 'fun goodFunc() {}' },
      { relativePath: 'Bad.kt', absolutePath: '/Bad.kt', content: 'fun BadFunc() {}' },
    ];
    const issues = checkAst(ktFiles, ktRule);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('Bad.kt');
    expect(issues[0].message).toContain('BadFunc');
  });
});
