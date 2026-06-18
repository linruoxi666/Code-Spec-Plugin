import { Router } from 'express';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { REPORTS_DIR } from '../store.js';

const router = Router();

router.get('/:fileName', async (req, res) => {
  const { fileName } = req.params;
  if (!fileName || !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}\.html$/.test(fileName)) {
    res.status(400).json({ error: 'Invalid report file name' });
    return;
  }

  const filePath = resolve(REPORTS_DIR, fileName);
  try {
    const content = await readFile(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch {
    res.status(404).json({ error: 'Report not found' });
  }
});

export default router;
