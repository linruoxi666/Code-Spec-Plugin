import { Router } from 'express';
import { loadHistory, clearHistory } from '../store.js';

const router = Router();

router.get('/', async (_req, res) => {
  const history = await loadHistory();
  res.json(history);
});

router.delete('/', async (_req, res) => {
  await clearHistory();
  res.json({ ok: true });
});

export default router;
