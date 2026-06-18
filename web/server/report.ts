// Self-contained HTML report renderer for the web dashboard.
// Duplicated from src/report/html-reporter.ts to avoid cross-package imports during build.

type Dimension = '创新' | '架构' | '安全' | '规范' | '简洁' | '注释';
type Severity = 'error' | 'warning' | 'info';

interface Issue {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  severity: Severity;
  message: string;
  dimension?: Dimension;
}

interface DimensionResult {
  dimension: Dimension;
  score: number;
  issues: Issue[];
  metrics: Array<{ name: string; value: number; unit?: string }>;
}

export interface EvaluateReport {
  totalScore: number;
  dimensions: DimensionResult[];
  issues: Issue[];
}

const DIMENSION_ORDER: Dimension[] = ['规范', '简洁', '注释', '安全', '架构', '创新'];

const DIMENSION_COLORS: Record<Dimension, string> = {
  '规范': '#2563eb',
  '简洁': '#059669',
  '注释': '#ca8a04',
  '安全': '#dc2626',
  '架构': '#7c3aed',
  '创新': '#db2777',
};

const SEVERITY_COLORS: Record<Severity | string, string> = {
  error: '#dc2626',
  warning: '#ca8a04',
  info: '#2563eb',
};

const SEVERITY_ORDER: Record<Severity | string, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function renderReportHtml(report: EvaluateReport): string {
  const dataJson = JSON.stringify(report)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
  const dataLiteral = JSON.stringify(dataJson);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>代码规范评估报告</title>
<style>
  :root {
    --bg: #f8fafc;
    --card: #ffffff;
    --text: #111827;
    --muted: #6b7280;
    --border: #e5e7eb;
    --accent: #2563eb;
    --shadow: 0 8px 24px rgba(17,24,39,.06);
    --radius: 14px;
  }
  [data-theme="dark"] {
    --bg: #0f172a;
    --card: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --border: #334155;
    --accent: #60a5fa;
    --shadow: 0 8px 24px rgba(0,0,0,.35);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    transition: background .2s, color .2s;
  }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 32px 20px 48px; }
  header {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
    margin-bottom: 28px; flex-wrap: wrap;
  }
  h1 { margin: 0; font-size: 30px; letter-spacing: -0.02em; }
  .meta { color: var(--muted); font-size: 14px; margin-top: 6px; }
  .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  button, .chip {
    background: var(--card); border: 1px solid var(--border); color: var(--text);
    border-radius: 999px; padding: 8px 14px; font-size: 13px; cursor: pointer;
    transition: all .15s; box-shadow: var(--shadow);
  }
  button:hover, .chip:hover { border-color: var(--accent); }
  button.active, .chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; margin-bottom: 18px; }
  .card {
    background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 22px; box-shadow: var(--shadow); transition: background .2s, border .2s;
  }
  .card h2 { margin: 0 0 14px; font-size: 16px; color: var(--text); }
  .score-row { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
  .stat { background: rgba(148,163,184,.1); border-radius: 10px; padding: 12px 8px; text-align: center; }
  .stat .n { font-size: 24px; font-weight: 700; }
  .stat .l { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-top: 4px; }
  .bar-row { display: grid; grid-template-columns: 80px 1fr 44px; gap: 10px; align-items: center; margin: 9px 0; font-size: 13px; }
  .bar-track { height: 9px; background: rgba(148,163,184,.18); border-radius: 999px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; transition: width .6s ease; }
  .bar-value { text-align: right; font-weight: 600; }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; }
  .filters label { font-size: 13px; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border-bottom: 1px solid var(--border); padding: 11px 8px; text-align: left; vertical-align: top; }
  th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; cursor: pointer; user-select: none; }
  th:hover { color: var(--accent); }
  th .sort { font-size: 10px; margin-left: 4px; opacity: .5; }
  code { font-family: ui-monospace, Consolas, monospace; font-size: 12px; word-break: break-word; }
  .sev {
    display: inline-block; color: #fff; font-size: 11px; font-weight: 700;
    padding: 3px 9px; border-radius: 999px; white-space: nowrap;
  }
  .muted { color: var(--muted); font-size: 13px; }
  .chart-wrap { display: flex; justify-content: center; align-items: center; min-height: 220px; }
  footer { margin-top: 30px; color: var(--muted); font-size: 12px; text-align: center; }
  .empty { text-align: center; padding: 40px; color: var(--muted); }
  .notice {
    background: rgba(37,99,235,.08); border: 1px solid rgba(37,99,235,.25);
    color: var(--text); border-radius: var(--radius); padding: 14px 18px;
    margin-bottom: 18px; font-size: 13px; line-height: 1.6;
  }
  .notice strong { color: var(--accent); }
  @media (max-width: 640px) {
    .stats { grid-template-columns: repeat(3, 1fr); }
    .bar-row { grid-template-columns: 70px 1fr 36px; }
    header { flex-direction: column; }
  }
</style>
</head>
<body data-theme="light">
<div class="wrap">
  <header>
    <div>
      <h1>代码规范评估报告</h1>
      <div class="meta" id="reportMeta"></div>
    </div>
    <div class="toolbar">
      <button id="themeBtn" onclick="toggleTheme()">🌙 深色</button>
      <button onclick="exportJson()">⬇ 导出 JSON</button>
    </div>
  </header>

  <div id="llmNotice"></div>

  <div class="grid">
    <div class="card">
      <h2>健康评分</h2>
      <div class="score-row">
        <div id="ringChart"></div>
        <div>
          <div id="scoreInfo" class="meta"></div>
        </div>
      </div>
      <div class="stats" id="severityStats"></div>
    </div>

    <div class="card">
      <h2>问题等级分布</h2>
      <div class="chart-wrap" id="distChart"></div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>维度评分</h2>
      <div id="dimensionBars"></div>
    </div>
    <div class="card">
      <h2>维度雷达</h2>
      <div class="chart-wrap" id="radarChart"></div>
    </div>
  </div>

  <div class="card">
    <h2 id="issuesTitle">问题列表</h2>
    <div class="filters">
      <label>等级：</label>
      <span class="chip active" data-filter="severity" data-value="all" onclick="setFilter('severity','all')">全部</span>
      <span class="chip" data-filter="severity" data-value="error" onclick="setFilter('severity','error')">错误</span>
      <span class="chip" data-filter="severity" data-value="warning" onclick="setFilter('severity','warning')">警告</span>
      <span class="chip" data-filter="severity" data-value="info" onclick="setFilter('severity','info')">信息</span>
    </div>
    <div class="filters" id="dimFilters"></div>
    <div id="issuesTable"></div>
  </div>

  <footer>代码规范插件 — 自包含报告 · 生成于 <span id="genTime"></span></footer>
</div>

<script>
const reportData = JSON.parse(${dataLiteral});
const DIMENSION_ORDER = ${JSON.stringify(DIMENSION_ORDER)};
const DIMENSION_COLORS = ${JSON.stringify(DIMENSION_COLORS)};
const SEVERITY_COLORS = ${JSON.stringify(SEVERITY_COLORS)};
const SEVERITY_ORDER = ${JSON.stringify(SEVERITY_ORDER)};
const SEVERITY_LABELS = { error: '错误', warning: '警告', info: '信息' };
const LLM_DIMENSIONS = ['创新', '架构', '安全'];

function isUnevaluated(dim, score, dimensions) {
  if (score !== 0) return false;
  if (!LLM_DIMENSIONS.includes(dim)) return false;
  const d = dimensions.find(x => x.dimension === dim);
  if (!d) return false;
  return d.issues.some(i => i.rule === \`llm-\${dim}\` && i.severity === 'info');
}

let filters = { severity: 'all', dimension: 'all' };
let sort = { key: 'severity', dir: 'asc' };

function scoreColor(s) {
  if (s == null) return '#6b7280';
  if (s >= 90) return '#059669';
  if (s >= 75) return '#16a34a';
  if (s >= 60) return '#ca8a04';
  if (s >= 40) return '#ea580c';
  return '#dc2626';
}
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderRing(score) {
  const size = 150, r = (size - 16) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const dash = (pct / 100) * c;
  const color = scoreColor(score);
  const cx = size / 2, cy = size / 2;
  return \`<svg width="\${size}" height="\${size}" viewBox="0 0 \${size} \${size}">
    <circle cx="\${cx}" cy="\${cy}" r="\${r}" fill="none" stroke="rgba(148,163,184,.25)" stroke-width="12"/>
    <circle cx="\${cx}" cy="\${cy}" r="\${r}" fill="none" stroke="\${color}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="\${dash} \${c}" transform="rotate(-90 \${cx} \${cy})"/>
    <text x="\${cx}" y="\${cy - 2}" text-anchor="middle" font-size="34" font-weight="700" fill="currentColor">\${Math.round(score ?? 0)}</text>
    <text x="\${cx}" y="\${cy + 22}" text-anchor="middle" font-size="12" fill="var(--muted)">综合</text>
  </svg>\`;
}

function renderDimensionBars(dimensions) {
  const map = Object.fromEntries(dimensions.map(d => [d.dimension, (d.score ?? 0) * 10]));
  return DIMENSION_ORDER.map(dim => {
    const rawScore = (dimensions.find(d => d.dimension === dim)?.score ?? 0);
    const score = rawScore * 10;
    if (isUnevaluated(dim, rawScore, dimensions)) {
      return \`<div class="bar-row">
        <div>\${esc(dim)}</div>
        <div class="bar-track"></div>
        <div class="bar-value muted">未评估</div>
      </div>\`;
    }
    const pct = Math.max(0, Math.min(100, score));
    const color = DIMENSION_COLORS[dim] || scoreColor(score);
    return \`<div class="bar-row">
      <div>\${esc(dim)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:\${pct}%;background:\${color}"></div></div>
      <div class="bar-value">\${Math.round(score)}</div>
    </div>\`;
  }).join('');
}

function renderRadar(dimensions) {
  const map = Object.fromEntries(dimensions.map(d => [d.dimension, (d.score ?? 0) * 10]));
  const labels = DIMENSION_ORDER.filter(dim => !isUnevaluated(dim, dimensions.find(d => d.dimension === dim)?.score ?? 0, dimensions));
  if (labels.length < 3) {
    return \`<div class="empty">已评估维度不足，无法生成雷达图</div>\`;
  }
  const size = 360, cx = size/2, cy = size/2, radius = 120;
  const vals = labels.map(d => map[d] ?? 0);
  const max = 100;
  const angle = i => (Math.PI * 2 * i) / labels.length - Math.PI / 2;
  const pt = (i, r) => {
    const a = angle(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  let grid = '', gridLabels = '', labelEls = '', scoreLabels = '';
  for (let g = 1; g <= 4; g++) {
    const r = (radius / 4) * g;
    const pts = labels.map((_, i) => pt(i, r).join(',')).join(' ');
    grid += \`<polygon points="\${pts}" fill="none" stroke="rgba(148,163,184,.22)" stroke-width="1"/>\`;
    gridLabels += \`<text x="\${cx + 4}" y="\${cy - r - 4}" font-size="9" fill="rgba(148,163,184,.6)">\${Math.round((g / 4) * max)}</text>\`;
  }
  for (let i = 0; i < labels.length; i++) {
    const [x, y] = pt(i, radius);
    const [lx, ly] = pt(i, radius + 22);
    const [sx, sy] = pt(i, radius + 36);
    const val = Math.round(vals[i] ?? 0);
    labelEls += \`<line x1="\${cx}" y1="\${cy}" x2="\${x}" y2="\${y}" stroke="rgba(148,163,184,.25)" stroke-width="1"/>
      <text x="\${lx}" y="\${ly}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="var(--muted)" font-weight="500">\${esc(labels[i])}</text>
      <text x="\${sx}" y="\${sy}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="var(--accent)" font-weight="600">\${val}</text>\`;
  }
  const dataPts = labels.map((_, i) => {
    const r = ((vals[i] ?? 0) / max) * radius;
    return pt(i, r).join(',');
  }).join(' ');
  const poly = \`<polygon points="\${dataPts}" fill="rgba(37,99,235,.25)" stroke="#2563eb" stroke-width="2.5"/>\`;
  const dots = labels.map((_, i) => {
    const r = ((vals[i] ?? 0) / max) * radius;
    const [x, y] = pt(i, r);
    return \`<circle cx="\${x}" cy="\${y}" r="3.5" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>\`;
  }).join('');
  return \`<svg width="\${size}" height="\${size}" viewBox="0 0 \${size} \${size}">\${grid}\${gridLabels}\${labelEls}\${poly}\${dots}</svg>\`;
}

function renderDist(issues) {
  const counts = { error:0, warning:0, info:0 };
  issues.forEach(f => { if (counts[f.severity] != null) counts[f.severity]++; });
  const entries = Object.entries(counts).filter(([,n]) => n > 0);
  const max = Math.max(...entries.map(([,n]) => n));
  const barW = 40, gap = 18, topPad = 22, bottomPad = 18;
  const h = 150;
  const w = entries.length * (barW + gap) + gap;
  const chartH = h - topPad - bottomPad;
  let bars = '', labels = '';
  entries.forEach(([sev, n], i) => {
    const x = gap + i * (barW + gap);
    const bh = max ? (n / max) * chartH : 0;
    const y = h - bh - bottomPad;
    bars += \`<rect x="\${x}" y="\${y}" width="\${barW}" height="\${bh}" rx="5" fill="\${SEVERITY_COLORS[sev]}"/>
      <text x="\${x + barW/2}" y="\${y - 8}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text)">\${n}</text>\`;
    labels += \`<text x="\${x + barW/2}" y="\${h - 4}" text-anchor="middle" font-size="11" fill="var(--muted)">\${esc(SEVERITY_LABELS[sev] || sev)}</text>\`;
  });
  return \`<svg width="\${w}" height="\${h}" viewBox="0 0 \${w} \${h}">\${bars}\${labels}</svg>\`;
}

function filteredIssues() {
  return reportData.issues.filter(f => {
    if (filters.severity !== 'all' && f.severity !== filters.severity) return false;
    if (filters.dimension !== 'all' && f.dimension !== filters.dimension) return false;
    return true;
  }).sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    if (sort.key === 'severity') return dir * (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    const av = String(a[sort.key] ?? '').toLowerCase();
    const bv = String(b[sort.key] ?? '').toLowerCase();
    return dir * (av > bv ? 1 : av < bv ? -1 : 0);
  });
}

function renderIssues() {
  const list = filteredIssues();
  document.getElementById('issuesTitle').textContent = \`问题列表（\${list.length}）\`;
  if (!list.length) {
    document.getElementById('issuesTable').innerHTML = '<div class="empty">没有符合当前筛选条件的问题。</div>';
    return;
  }
  const headers = [
    { key:'severity', label:'等级' },
    { key:'rule', label:'规则' },
    { key:'dimension', label:'维度' },
    { key:'file', label:'文件' },
    { key:'message', label:'说明' }
  ];
  const thead = '<thead><tr>' + headers.map(h =>
    \`<th onclick="setSort('\${h.key}')">\${esc(h.label)}<span class="sort">\${sort.key === h.key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}</span></th>\`
  ).join('') + '</tr></thead>';
  const rows = list.map(f => \`<tr>
    <td><span class="sev" style="background:\${SEVERITY_COLORS[f.severity] || '#6b7280'}">\${esc(SEVERITY_LABELS[f.severity] || f.severity)}</span></td>
    <td><code>\${esc(f.rule)}</code></td>
    <td>\${esc(f.dimension || '—')}</td>
    <td><code>\${esc(f.file)}\${f.line ? ':' + f.line : ''}</code></td>
    <td>\${esc(f.message)}</td>
  </tr>\`).join('');
  document.getElementById('issuesTable').innerHTML = \`<table>\${thead}<tbody>\${rows}</tbody></table>\`;
}

function setFilter(type, value) {
  filters[type] = value;
  document.querySelectorAll(\`[data-filter="\${type}"]\`).forEach(el => {
    el.classList.toggle('active', el.dataset.value === value);
  });
  renderIssues();
}

function setSort(key) {
  if (sort.key === key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
  else { sort.key = key; sort.dir = 'asc'; }
  renderIssues();
}

function toggleTheme() {
  const body = document.body;
  const isDark = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('themeBtn').textContent = isDark ? '🌙 深色' : '☀ 浅色';
}

function exportJson() {
  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'code-spec-report.json';
  a.click();
  URL.revokeObjectURL(url);
}

function renderDimensionFilters(dimensions) {
  const dims = dimensions.map(d => d.dimension);
  const html = \`<label>维度：</label>\` +
    \`<span class="chip active" data-filter="dimension" data-value="all" onclick="setFilter('dimension','all')">全部</span>\` +
    dims.map(dim =>
      \`<span class="chip" data-filter="dimension" data-value="\${dim}" onclick="setFilter('dimension','\${esc(dim)}')">\${esc(dim)}</span>\`
    ).join('');
  document.getElementById('dimFilters').innerHTML = html;
}

function init() {
  const total = reportData.totalScore ?? 0;
  document.getElementById('reportMeta').innerHTML =
    \`问题总数：<strong>\${reportData.issues.length}</strong> · 评估维度：<strong>\${reportData.dimensions.length}</strong>\`;
  document.getElementById('ringChart').innerHTML = renderRing(total * 10);
  document.getElementById('scoreInfo').innerHTML = '综合健康分（满分 100）';

  const unevaluated = LLM_DIMENSIONS.filter(dim => {
    const d = reportData.dimensions.find(x => x.dimension === dim);
    return d && isUnevaluated(dim, d.score, reportData.dimensions);
  });
  if (unevaluated.length > 0) {
    document.getElementById('llmNotice').innerHTML =
      \`<div class="notice">以下维度需要启用 LLM Judge 才能评估，当前显示为“未评估”：\${unevaluated.map(esc).join('、')}。如不需要 LLM 评估，可忽略。</div>\`;
  }

  const counts = { error:0, warning:0, info:0 };
  reportData.issues.forEach(f => { if (counts[f.severity] != null) counts[f.severity]++; });
  document.getElementById('severityStats').innerHTML = [
    ['error','#dc2626','错误'], ['warning','#ca8a04','警告'], ['info','#2563eb','信息']
  ].map(([k,c,l]) => \`<div class="stat"><div class="n" style="color:\${c}">\${counts[k]}</div><div class="l">\${l}</div></div>\`).join('');

  document.getElementById('dimensionBars').innerHTML = renderDimensionBars(reportData.dimensions);
  document.getElementById('radarChart').innerHTML = renderRadar(reportData.dimensions);
  document.getElementById('distChart').innerHTML = renderDist(reportData.issues);

  renderDimensionFilters(reportData.dimensions);
  renderIssues();
  document.getElementById('genTime').textContent = new Date().toLocaleString();
}

init();
</script>
</body>
</html>
`;
}
