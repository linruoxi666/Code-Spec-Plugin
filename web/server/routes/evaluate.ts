import { Router } from 'express';
import { spawn } from 'node:child_process';
import { basename, resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { addEntry, REPORTS_DIR } from '../store.js';
import { renderReportHtml, type EvaluateReport } from '../report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EvaluateBody {
  projectPath: string;
  enableLlmJudge?: boolean;
}

const CLI_PATH = process.env.CODE_SPEC_CLI_PATH ?? resolve(__dirname, '..', '..', '..', 'src', 'cli.ts');
const IS_TS = CLI_PATH.endsWith('.ts');

const router = Router();

router.post('/', async (req, res) => {
  const { projectPath, enableLlmJudge } = req.body as EvaluateBody;
  if (!projectPath) {
    res.status(400).json({ error: 'projectPath is required' });
    return;
  }

  const args = ['evaluate', projectPath];
  if (enableLlmJudge) {
    args.push('--llm');
  }

  const command = IS_TS ? 'npx' : CLI_PATH;
  const commandArgs = IS_TS ? ['tsx', CLI_PATH, ...args] : [...args];
  const proc = spawn(command, commandArgs, { cwd: projectPath, shell: true });
  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data: Buffer) => {
    stdout += data.toString();
  });

  proc.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  proc.on('close', async (code) => {
    if (code !== 0) {
      res.status(500).json({ error: 'Evaluation failed', details: stderr || stdout });
      return;
    }

    try {
      const report = JSON.parse(stdout.trim()) as EvaluateReport;

      const id = randomUUID();
      const reportFileName = `${id}.html`;
      const reportPath = resolve(REPORTS_DIR, reportFileName);
      await mkdir(REPORTS_DIR, { recursive: true });
      await writeFile(reportPath, renderReportHtml(report), 'utf-8');

      const entry = {
        id,
        projectPath,
        projectName: basename(projectPath),
        timestamp: new Date().toISOString(),
        totalScore: report.totalScore,
        dimensions: report.dimensions.map((d) => ({ dimension: d.dimension, score: d.score })),
        issueCount: report.issues.length,
        reportPath: `/api/reports/${reportFileName}`,
      };

      await addEntry(entry);
      res.json({ report, entry });
    } catch (err) {
      res.status(500).json({ error: 'Failed to process evaluation output', details: err instanceof Error ? err.message : String(err), output: stdout });
    }
  });
});

export default router;
