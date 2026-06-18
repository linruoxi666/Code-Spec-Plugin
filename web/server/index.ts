import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import evaluateRouter from './routes/evaluate.js';
import historyRouter from './routes/history.js';
import reportsRouter from './routes/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());

app.use('/api/evaluate', evaluateRouter);
app.use('/api/history', historyRouter);
app.use('/api/reports', reportsRouter);

const clientDist = join(__dirname, '..', 'dist', 'client');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Code Spec web server running at http://localhost:${PORT}`);
});
