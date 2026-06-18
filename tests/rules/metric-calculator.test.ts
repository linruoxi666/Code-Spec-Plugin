import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '../../src/rules/metric-calculator';
import type { RuleDefinition, SourceFile } from '../../src/types/index.js';

const commentRule: RuleDefinition = {
  id: 'comment-coverage',
  dimension: '注释',
  weight: 0.1,
  severity: 'warning',
  check: { type: 'metric', message: '注释覆盖率不足', threshold: 0.1 },
};

const fileRule: RuleDefinition = {
  id: 'file-length',
  dimension: '简洁',
  weight: 0.1,
  severity: 'warning',
  check: { type: 'metric', message: '文件过长', threshold: 10 },
};

const files: SourceFile[] = [
  { relativePath: 'a.ts', absolutePath: '/a.ts', content: '// comment\nconst a = 1;\n' },
  { relativePath: 'b.ts', absolutePath: '/b.ts', content: 'const b = 2;\n'.repeat(20) },
];

describe('calculateMetrics', () => {
  it('checks comment coverage', () => {
    const result = calculateMetrics(files, commentRule);
    expect(result.metrics[0].value).toBeGreaterThan(0);
  });

  it('detects long files', () => {
    const result = calculateMetrics(files, fileRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('b.ts');
  });

  it('detects long functions', () => {
    const functionRule: RuleDefinition = {
      id: 'function-length',
      dimension: '简洁',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: '函数过长', threshold: 5 },
    };
    const longFunction = 'function longFunc() {\n' + 'console.log(1);\n'.repeat(10) + '}';
    const functionFiles: SourceFile[] = [
      { relativePath: 'short.ts', absolutePath: '/short.ts', content: 'function a() { return 1; }' },
      { relativePath: 'long.ts', absolutePath: '/long.ts', content: longFunction },
    ];
    const result = calculateMetrics(functionFiles, functionRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('long.ts');
  });

  it('detects long Java methods', () => {
    const functionRule: RuleDefinition = {
      id: 'function-length',
      dimension: '简洁',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: 'Java 方法过长', threshold: 5 },
    };
    const longMethod = 'public void longMethod() {\n' + 'System.out.println(1);\n'.repeat(10) + '}';
    const javaFiles: SourceFile[] = [
      { relativePath: 'Short.java', absolutePath: '/Short.java', content: 'public class Short { public void a() { return; } }' },
      { relativePath: 'Long.java', absolutePath: '/Long.java', content: `public class Long { ${longMethod} }` },
    ];
    const result = calculateMetrics(javaFiles, functionRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('Long.java');
  });

  it('detects long Go functions', () => {
    const functionRule: RuleDefinition = {
      id: 'function-length',
      dimension: '简洁',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: 'Go 函数过长', threshold: 5 },
    };
    const longFunc = 'func longFunc() {\n' + 'fmt.Println(1)\n'.repeat(10) + '}';
    const goFiles: SourceFile[] = [
      { relativePath: 'short.go', absolutePath: '/short.go', content: 'package main\nfunc a() { return }' },
      { relativePath: 'long.go', absolutePath: '/long.go', content: `package main\n${longFunc}` },
    ];
    const result = calculateMetrics(goFiles, functionRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('long.go');
  });

  it('detects long Rust functions', () => {
    const functionRule: RuleDefinition = {
      id: 'function-length',
      dimension: '简洁',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: 'Rust 函数过长', threshold: 5 },
    };
    const longFunc = 'fn long_func() {\n' + 'println!("1");\n'.repeat(10) + '}';
    const rustFiles: SourceFile[] = [
      { relativePath: 'short.rs', absolutePath: '/short.rs', content: 'fn a() {}' },
      { relativePath: 'long.rs', absolutePath: '/long.rs', content: longFunc },
    ];
    const result = calculateMetrics(rustFiles, functionRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('long.rs');
  });

  it('detects long Python functions', () => {
    const functionRule: RuleDefinition = {
      id: 'function-length',
      dimension: '简洁',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: 'Python 函数过长', threshold: 5 },
    };
    const longFunc = 'def long_func():\n' + '    print(1)\n'.repeat(10);
    const pyFiles: SourceFile[] = [
      { relativePath: 'short.py', absolutePath: '/short.py', content: 'def a():\n    pass' },
      { relativePath: 'long.py', absolutePath: '/long.py', content: longFunc },
    ];
    const result = calculateMetrics(pyFiles, functionRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('long.py');
  });

  it('checks Rust doc coverage', () => {
    const docRule: RuleDefinition = {
      id: 'rust-doc-coverage',
      dimension: '注释',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: 'Rust 文档注释覆盖率不足', threshold: 0.1 },
    };
    const rustFiles: SourceFile[] = [
      { relativePath: 'a.rs', absolutePath: '/a.rs', content: 'fn a() {}\nfn b() {}\nfn c() {}\n' },
    ];
    const result = calculateMetrics(rustFiles, docRule);
    expect(result.metrics[0].value).toBe(0);
  });

  it('checks Python doc coverage', () => {
    const docRule: RuleDefinition = {
      id: 'python-doc-coverage',
      dimension: '注释',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: 'Python 文档字符串覆盖率不足', threshold: 0.1 },
    };
    const pyFiles: SourceFile[] = [
      { relativePath: 'a.py', absolutePath: '/a.py', content: 'def a():\n    """doc"""\n    pass\n' },
    ];
    const result = calculateMetrics(pyFiles, docRule);
    expect(result.metrics[0].value).toBeGreaterThan(0);
  });

  it('detects long Kotlin functions', () => {
    const functionRule: RuleDefinition = {
      id: 'function-length',
      dimension: '简洁',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: 'Kotlin 函数过长', threshold: 5 },
    };
    const longFunc = 'fun longFunc() {\n' + '    println(1)\n'.repeat(10) + '}';
    const ktFiles: SourceFile[] = [
      { relativePath: 'short.kt', absolutePath: '/short.kt', content: 'fun a() {}' },
      { relativePath: 'long.kt', absolutePath: '/long.kt', content: longFunc },
    ];
    const result = calculateMetrics(ktFiles, functionRule);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].file).toBe('long.kt');
  });

  it('checks KDoc coverage', () => {
    const docRule: RuleDefinition = {
      id: 'kdoc-coverage',
      dimension: '注释',
      weight: 0.1,
      severity: 'warning',
      check: { type: 'metric', message: 'KDoc 覆盖率不足', threshold: 0.1 },
    };
    const ktFiles: SourceFile[] = [
      { relativePath: 'a.kt', absolutePath: '/a.kt', content: '/** doc */\nfun a() {}\n' },
    ];
    const result = calculateMetrics(ktFiles, docRule);
    expect(result.metrics[0].value).toBeGreaterThan(0);
  });
});
