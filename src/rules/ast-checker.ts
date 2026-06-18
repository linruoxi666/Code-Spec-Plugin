import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import Java from 'tree-sitter-java';
import Kotlin from 'tree-sitter-kotlin';
import Go from 'tree-sitter-go';
import Rust from 'tree-sitter-rust';
import Python from 'tree-sitter-python';
import type { Issue, RuleDefinition, SourceFile } from '../types/index.js';

const tsParser = new Parser();
tsParser.setLanguage(TypeScript.typescript);

const javaParser = new Parser();
javaParser.setLanguage(Java);

const kotlinParser = new Parser();
kotlinParser.setLanguage(Kotlin);

const goParser = new Parser();
goParser.setLanguage(Go);

const rustParser = new Parser();
rustParser.setLanguage(Rust);

const pythonParser = new Parser();
pythonParser.setLanguage(Python);

function isTsFile(path: string): boolean {
  return path.endsWith('.ts') || path.endsWith('.tsx');
}

function isJavaFile(path: string): boolean {
  return path.endsWith('.java');
}

function isKotlinFile(path: string): boolean {
  return path.endsWith('.kt');
}

function isGoFile(path: string): boolean {
  return path.endsWith('.go');
}

function isRustFile(path: string): boolean {
  return path.endsWith('.rs');
}

function isPythonFile(path: string): boolean {
  return path.endsWith('.py');
}

function parseFile(file: SourceFile): Parser.Tree | null {
  if (isTsFile(file.relativePath)) {
    return tsParser.parse(file.content);
  }
  if (isJavaFile(file.relativePath)) {
    return javaParser.parse(file.content);
  }
  if (isKotlinFile(file.relativePath)) {
    return kotlinParser.parse(file.content);
  }
  if (isGoFile(file.relativePath)) {
    return goParser.parse(file.content);
  }
  if (isRustFile(file.relativePath)) {
    return rustParser.parse(file.content);
  }
  if (isPythonFile(file.relativePath)) {
    return pythonParser.parse(file.content);
  }
  return null;
}

export function checkAst(files: SourceFile[], rule: RuleDefinition): Issue[] {
  if (rule.check.type !== 'ast-query') return [];

  const issues: Issue[] = [];
  for (const file of files) {
    if (rule.id === 'no-hardcoded-secrets') {
      issues.push(...checkHardcodedSecrets(file, rule));
      continue;
    }

    const tree = parseFile(file);
    if (!tree) continue;
    const root = tree.rootNode;

    if (rule.id === 'naming-convention') {
      issues.push(...checkNamingConvention(file, root, rule));
    }

    if (rule.id === 'react-component-naming') {
      issues.push(...checkReactComponentNaming(file, root, rule));
    }

    if (rule.id === 'java-class-naming') {
      issues.push(...checkJavaClassNaming(file, root, rule));
    }

    if (rule.id === 'java-method-naming') {
      issues.push(...checkJavaMethodNaming(file, root, rule));
    }

    if (rule.id === 'kotlin-class-naming') {
      issues.push(...checkKotlinClassNaming(file, root, rule));
    }

    if (rule.id === 'kotlin-function-naming') {
      issues.push(...checkKotlinFunctionNaming(file, root, rule));
    }

    if (rule.id === 'go-function-naming') {
      issues.push(...checkGoFunctionNaming(file, root, rule));
    }

    if (rule.id === 'go-type-naming') {
      issues.push(...checkGoTypeNaming(file, root, rule));
    }

    if (rule.id === 'rust-function-naming') {
      issues.push(...checkRustFunctionNaming(file, root, rule));
    }

    if (rule.id === 'rust-struct-naming') {
      issues.push(...checkRustStructNaming(file, root, rule));
    }

    if (rule.id === 'python-function-naming') {
      issues.push(...checkPythonFunctionNaming(file, root, rule));
    }

    if (rule.id === 'python-class-naming') {
      issues.push(...checkPythonClassNaming(file, root, rule));
    }
  }
  return issues;
}

function checkNamingConvention(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const functions = root.descendantsOfType('function_declaration');
  for (const fn of functions) {
    const nameNode = fn.childForFieldName('name');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkReactComponentNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  if (!file.relativePath.endsWith('.tsx')) return issues;
  const functions = root.descendantsOfType('function_declaration');
  for (const fn of functions) {
    const nameNode = fn.childForFieldName('name');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkJavaClassNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const classes = root.descendantsOfType('class_declaration');
  for (const cls of classes) {
    const nameNode = cls.childForFieldName('name');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkJavaMethodNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const methods = root.descendantsOfType('method_declaration');
  for (const method of methods) {
    const nameNode = method.childForFieldName('name');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkKotlinClassNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const classes = root.descendantsOfType('class_declaration');
  for (const cls of classes) {
    const nameNode = cls.childForFieldName('name') ?? cls.namedChildren.find((c) => c.type === 'type_identifier');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkKotlinFunctionNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const functions = root.descendantsOfType('function_declaration');
  for (const fn of functions) {
    const nameNode = fn.childForFieldName('name') ?? fn.namedChildren.find((c) => c.type === 'simple_identifier');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkGoFunctionNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const functions = root.descendantsOfType('function_declaration');
  for (const fn of functions) {
    const nameNode = fn.childForFieldName('name');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkGoTypeNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const types = root.descendantsOfType('type_declaration');
  for (const typeDecl of types) {
    const spec = typeDecl.childForFieldName('type_spec') ?? typeDecl.namedChildren.find((c) => c.type === 'type_spec');
    if (!spec) continue;
    const nameNode = spec.childForFieldName('name');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkRustFunctionNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const functions = root.descendantsOfType('function_item');
  for (const fn of functions) {
    const nameNode = fn.childForFieldName('name') ?? fn.namedChildren.find((c) => c.type === 'identifier');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkRustStructNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const structs = root.descendantsOfType('struct_item');
  for (const st of structs) {
    const nameNode = st.childForFieldName('name') ?? st.namedChildren.find((c) => c.type === 'type_identifier');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[A-Z][a-zA-Z0-9_]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkPythonFunctionNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const functions = root.descendantsOfType('function_definition');
  for (const fn of functions) {
    const nameNode = fn.childForFieldName('name');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkPythonClassNaming(file: SourceFile, root: Parser.Tree['rootNode'], rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const classes = root.descendantsOfType('class_definition');
  for (const cls of classes) {
    const nameNode = cls.childForFieldName('name');
    if (!nameNode) continue;
    const name = nameNode.text;
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      issues.push({
        file: file.relativePath,
        line: nameNode.startPosition.row + 1,
        column: nameNode.startPosition.column + 1,
        rule: rule.id,
        severity: rule.severity,
        message: `${rule.check.message}: ${name}`,
      });
    }
  }
  return issues;
}

function checkHardcodedSecrets(file: SourceFile, rule: RuleDefinition): Issue[] {
  const issues: Issue[] = [];
  const secretPatterns = [
    /['"]sk-[a-zA-Z0-9_-]{10,}['"]/,
    /['"][a-zA-Z0-9_-]*password[a-zA-Z0-9_-]*['"]\s*[:=]\s*['"][^'"]+['"]/i,
    /['"][a-zA-Z0-9_-]*api[_-]?key[a-zA-Z0-9_-]*['"]\s*[:=]\s*['"][^'"]+['"]/i,
    /['"][a-zA-Z0-9_-]*token[a-zA-Z0-9_-]*['"]\s*[:=]\s*['"][^'"]+['"]/i,
  ];
  const lines = file.content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of secretPatterns) {
      if (pattern.test(line) && !line.includes('.example') && !line.includes('.env')) {
        issues.push({
          file: file.relativePath,
          line: i + 1,
          column: 1,
          rule: rule.id,
          severity: rule.severity,
          message: `${rule.check.message}: ${line.trim().slice(0, 80)}`,
        });
        break;
      }
    }
  }
  return issues;
}
