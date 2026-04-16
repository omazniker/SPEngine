// Settings Key-Value API
import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/settings — Alle Einstellungen
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = JSON.parse(r.value); });
  res.json(settings);
});

// GET /api/settings/:key — Einzelne Einstellung
router.get('/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
  if (!row) return res.status(404).json({ error: 'Einstellung nicht gefunden' });
  res.json({ key: req.params.key, value: JSON.parse(row.value) });
});

// PUT /api/settings/:key — Einstellung setzen/aktualisieren
router.put('/:key', (req, res) => {
  const { value } = req.body;
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(req.params.key, JSON.stringify(value));
  res.json({ key: req.params.key, updated: true });
});

export default router;
