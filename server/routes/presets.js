// Preset CRUD API
import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/presets — Alle Presets
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM presets ORDER BY is_default DESC, name ASC').all();
  rows.forEach(r => { r.config = JSON.parse(r.config || '{}'); });
  res.json(rows);
});

// POST /api/presets — Neues Preset erstellen
router.post('/', (req, res) => {
  const { name, icon, config } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });

  try {
    const info = db.prepare(`
      INSERT INTO presets (name, icon, config) VALUES (?, ?, ?)
    `).run(name, icon || '', JSON.stringify(config || {}));
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Preset mit diesem Namen existiert bereits' });
    }
    throw e;
  }
});

// PUT /api/presets/:id — Preset aktualisieren
router.put('/:id', (req, res) => {
  const { name, icon, config } = req.body;
  const info = db.prepare(`
    UPDATE presets SET
      name = COALESCE(?, name),
      icon = COALESCE(?, icon),
      config = COALESCE(?, config)
    WHERE id = ? AND is_default = 0
  `).run(
    name || null, icon || null,
    config ? JSON.stringify(config) : null,
    req.params.id
  );
  if (info.changes === 0) return res.status(404).json({ error: 'Preset nicht gefunden oder ist Default' });
  res.json({ updated: true });
});

// DELETE /api/presets/:id — Preset loeschen
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM presets WHERE id = ? AND is_default = 0').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Preset nicht gefunden oder ist Default' });
  res.json({ deleted: true });
});

export default router;
