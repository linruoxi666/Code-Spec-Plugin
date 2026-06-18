import { useEffect, useState } from 'react';
import './styles.css';

interface HistoryEntry {
  id: string;
  projectPath: string;
  projectName: string;
  timestamp: string;
  totalScore: number;
  dimensions: Array<{ dimension: string; score: number }>;
  issueCount: number;
}

interface Report {
  totalScore: number;
  dimensions: Array<{ dimension: string; score: number; weight: number }>;
  issues: Array<{ file: string; rule: string; severity: string; message: string; line?: number }>;
}

const API_BASE = '/api';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('code-spec-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [path, setPath] = useState('');
  const [enableLlm, setEnableLlm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<Theme>(getInitialTheme());

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('code-spec-theme', theme);
  }, [theme]);

  async function fetchHistory() {
    const res = await fetch(`${API_BASE}/history`);
    const data = (await res.json()) as HistoryEntry[];
    setHistory(data);
  }

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    if (!path.trim()) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch(`${API_BASE}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: path.trim(), enableLlmJudge: enableLlm }),
      });
      const data = (await res.json()) as { report?: Report; error?: string; details?: string };
      if (!res.ok) {
        setError(data.error ?? data.details ?? 'Evaluation failed');
      } else if (data.report) {
        setReport(data.report);
        await fetchHistory();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function clearHistory() {
    await fetch(`${API_BASE}/history`, { method: 'DELETE' });
    await fetchHistory();
    setCompareIds([]);
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  }

  const comparedEntries = history.filter((h) => compareIds.includes(h.id));

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>Code Spec Dashboard</h1>
            <p>本地代码质量评分仪表盘</p>
          </div>
          <button
            className="button theme-toggle"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="切换主题"
          >
            {theme === 'dark' ? '☀️ 浅色' : '🌙 深色'}
          </button>
        </div>
      </header>

      <section className="card">
        <h2>项目评分</h2>
        <form onSubmit={handleEvaluate} className="form">
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="输入本地项目绝对路径"
            className="input"
          />
          <label className="checkbox">
            <input type="checkbox" checked={enableLlm} onChange={(e) => setEnableLlm(e.target.checked)} />
            启用 LLM Judge
          </label>
          <button type="submit" disabled={loading} className="button primary">
            {loading ? '评分中...' : '开始评分'}
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      {report && (
        <section className="card">
          <h2>评分结果：{report.totalScore}</h2>
          <div className="dimensions">
            {report.dimensions.map((d) => (
              <div key={d.dimension} className="dimension">
                <span className="dimension-name">{d.dimension}</span>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${d.score}%` }} />
                </div>
                <span className="dimension-score">{d.score}</span>
              </div>
            ))}
          </div>
          <h3>问题列表 ({report.issues.length})</h3>
          <ul className="issues">
            {report.issues.slice(0, 20).map((issue, idx) => (
              <li key={idx} className={`issue ${issue.severity}`}>
                <strong>[{issue.severity}]</strong> {issue.message}
                <div className="issue-meta">
                  {issue.file}:{issue.line ?? '-'}
                </div>
              </li>
            ))}
            {report.issues.length > 20 && (
              <li className="issue">...还有 {report.issues.length - 20} 个问题</li>
            )}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="history-header">
          <h2>历史记录</h2>
          <button onClick={clearHistory} className="button danger">清空</button>
        </div>
        {history.length === 0 ? (
          <p className="empty">暂无记录</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>选择</th>
                <th>时间</th>
                <th>项目</th>
                <th>健康分</th>
                <th>问题数</th>
                <th>报告</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={compareIds.includes(h.id)}
                      onChange={() => toggleCompare(h.id)}
                    />
                  </td>
                  <td>{new Date(h.timestamp).toLocaleString()}</td>
                  <td>{h.projectName}</td>
                  <td>{h.totalScore}</td>
                  <td>{h.issueCount}</td>
                  <td>
                    {h.reportPath ? (
                      <a href={h.reportPath} target="_blank" rel="noreferrer" className="link">
                        详细报告
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {comparedEntries.length === 2 && (
        <section className="card">
          <h2>对比</h2>
          <div className="compare">
            {comparedEntries.map((h) => (
              <div key={h.id} className="compare-column">
                <h3>{h.projectName}</h3>
                <p>健康分：{h.totalScore}</p>
                {h.dimensions.map((d) => (
                  <div key={d.dimension} className="dimension">
                    <span className="dimension-name">{d.dimension}</span>
                    <div className="bar">
                      <div className="bar-fill" style={{ width: `${d.score}%` }} />
                    </div>
                    <span className="dimension-score">{d.score}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
