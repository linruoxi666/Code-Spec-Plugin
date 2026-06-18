"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
function activate(context) {
    const evaluateCommand = vscode.commands.registerCommand('codeSpec.evaluateProject', () => runEvaluation(false));
    const reportCommand = vscode.commands.registerCommand('codeSpec.generateReport', () => runEvaluation(true));
    context.subscriptions.push(evaluateCommand, reportCommand);
}
function deactivate() {
    // no-op
}
function runEvaluation(generateReport) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        void vscode.window.showErrorMessage('Code Spec: 请先打开一个工作区');
        return;
    }
    const config = vscode.workspace.getConfiguration('codeSpec');
    const cliPath = config.get('cliPath') ?? 'csi';
    const enableLlmJudge = config.get('enableLlmJudge') ?? false;
    const args = ['evaluate', workspaceFolder.uri.fsPath];
    if (enableLlmJudge) {
        args.push('--llm');
    }
    if (generateReport) {
        const reportPath = (0, node_path_1.join)(workspaceFolder.uri.fsPath, 'code-spec-report.html');
        args.push('--report', reportPath);
    }
    const channel = vscode.window.createOutputChannel('Code Spec');
    channel.show(true);
    channel.appendLine(`> ${cliPath} ${args.join(' ')}`);
    const proc = (0, node_child_process_1.spawn)(cliPath, args, { cwd: workspaceFolder.uri.fsPath, shell: true });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        channel.append(chunk);
    });
    proc.stderr.on('data', (data) => {
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
            const reportPath = (0, node_path_1.join)(workspaceFolder.uri.fsPath, 'code-spec-report.html');
            void vscode.window.showInformationMessage(`Code Spec 报告已生成：${reportPath}`, '打开').then((selection) => {
                if (selection === '打开') {
                    const uri = vscode.Uri.file(reportPath);
                    void vscode.commands.executeCommand('vscode.open', uri);
                }
            });
            return;
        }
        try {
            const report = JSON.parse(stdout);
            const score = report.totalScore ?? 'N/A';
            void vscode.window.showInformationMessage(`Code Spec 评分完成，健康分：${score}`);
        }
        catch {
            void vscode.window.showInformationMessage('Code Spec 评分完成');
        }
    });
}
//# sourceMappingURL=extension.js.map