import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface HistoryEntry {
  id: string;
  projectPath: string;
  projectName: string;
  timestamp: string;
  totalScore: number;
  dimensions: Array<{ dimension: string; score: number }>;
  issueCount: number;
  reportPath?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DATA_DIR = join(__dirname, '..', '..', '.code-spec-web');
export const REPORTS_DIR = join(DATA_DIR, 'reports');
const HISTORY_FILE = join(DATA_DIR, 'history.json');

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  await ensureDataDir();
  try {
    const content = await readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(content) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  await ensureDataDir();
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

export async function addEntry(entry: HistoryEntry): Promise<void> {
  const history = await loadHistory();
  history.unshift(entry);
  await saveHistory(history);
}

export async function clearHistory(): Promise<void> {
  await saveHistory([]);
}
