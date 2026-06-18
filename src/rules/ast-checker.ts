import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import type { Issue, RuleDefinition, SourceFile } from '../types/index.js';

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

export function checkAst(files: SourceFile[], rule: RuleDefinition): Issue[] {
  if (rule.check.type !== 'ast-query') return [];

  const issues: Issue[] = [];
  for (const file of files) {
    if (!file.relativePath.endsWith('.ts') && !file.relativePath.endsWith('.tsx')) continue;

    const tree = parser.parse(file.content);
    const root = tree.rootNode;

    if (rule.id === 'naming-convention') {
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
    }

    if (rule.id === 'react-component-naming') {
      if (!file.relativePath.endsWith('.tsx')) continue;
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
    }

    if (rule.id === 'no-hardcoded-secrets') {
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
    }
  }
  return issues;
}
