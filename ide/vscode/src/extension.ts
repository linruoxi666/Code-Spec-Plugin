import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

export function activate(context: vscode.ExtensionContext): void {
  const evaluateCommand = vscode.commands.registerCommand('codeSpec.evaluateProject', () => runEvaluation(false));
  const reportCommand = vscode.commands.registerCommand('codeSpec.generateReport', () => runEvaluation(true));

  context.subscriptions.push(evaluateCommand, reportCommand);
}

export function deactivate(): void {
  // no-op
}

function runEvaluation(generateReport: boolean): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    void vscode.window.showErrorMessage('Code Spec: 请先打开一个工作区');
    return;
  }

  const config = vscode.workspace.getConfiguration('codeSpec');
  const cliPath = config.get<string>('cliPath') ?? 'csi';
  const enableLlmJudge = config.get<boolean>('enableLlmJudge') ?? false;

  const args = ['evaluate', workspaceFolder.uri.fsPath];
  if (enableLlmJudge) {
    args.push('--llm');
  }
  if (generateReport) {
    const reportPath = join(workspaceFolder.uri.fsPath, 'code-spec-report.html');
    args.push('--report', reportPath);
  }

  const channel = vscode.window.createOutputChannel('Code Spec');
  channel.show(true);
  channel.appendLine(`> ${cliPath} ${args.join(' ')}`);

  const proc = spawn(cliPath, args, { cwd: workspaceFolder.uri.fsPath, shell: true });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data: Buffer) => {
    const chunk = data.toString();
    stdout += chunk;
    channel.append(chunk);
  });

  proc.stderr.on('data', (data: Buffer) => {
    const chunk = data.toString();
    stderr += chunk;
    channel.append(chunk);
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      void vscode.window.showErrorMessage(`Code Spec 执行失败（退出码 ${code ?? 'unknown'}）`);
      return;
    }

    if (generateReport) {
      const reportPath = join(workspaceFolder.uri.fsPath, 'code-spec-report.html');
      void vscode.window.showInformationMessage(
        `Code Spec 报告已生成：${reportPath}`,
        '打开'
      ).then((selection) => {
        if (selection === '打开') {
          const uri = vscode.Uri.file(reportPath);
          void vscode.commands.executeCommand('vscode.open', uri);
        }
      });
      return;
    }

    try {
      const report = JSON.parse(stdout) as { totalScore?: number };
      const score = report.totalScore ?? 'N/A';
      void vscode.window.showInformationMessage(`Code Spec 评分完成，健康分：${score}`);
    } catch {
      void vscode.window.showInformationMessage('Code Spec 评分完成');
    }
  });
}
