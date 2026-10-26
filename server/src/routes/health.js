import { Router } from 'express';
import { isDbUp } from '../db.js';
import { config } from '../config.js';

export const healthRouter = Router();

async function pingMl() {
  try {
    const res = await fetch(`${config.mlUrl}/health`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

healthRouter.get('/health', async (req, res) => {
  const db = isDbUp();
  const ml = await pingMl();
  res.status(db ? 200 : 503).json({ ok: db, db, ml, uptime: Math.round(process.uptime()) });
});
