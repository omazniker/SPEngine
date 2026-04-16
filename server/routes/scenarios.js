// Scenario CRUD API
import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/scenarios — Liste aller Szenarien
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, name,
           json_extract(stats, '$.wY') as yield,
           json_extract(stats, '$.wD') as duration,
           json_extract(stats, '$.wLn') as rating,
           created_at, updated_at
    FROM scenarios
    ORDER BY updated_at DESC
  `).all();
  res.json(rows);
});

// GET /api/scenarios/:id — Einzelnes Szenario mit vollem Detail
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Szenario nicht gefunden' });

  // Parse JSON fields
  row.config = JSON.parse(row.config || '{}');
  row.result = JSON.parse(row.result || '[]');
  row.stats = JSON.parse(row.stats || '{}');
  res.json(row);
});

// POST /api/scenarios — Neues Szenario erstellen
router.post('/', (req, res) => {
  const { name, config, result, stats } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });

  const info = db.prepare(`
    INSERT INTO scenarios (name, config, result, stats)
    VALUES (?, ?, ?, ?)
  `).run(
    name,
    JSON.stringify(config || {}),
    JSON.stringify(result || []),
    JSON.stringify(stats || {})
  );

  res.status(201).json({ id: info.lastInsertRowid, name });
});

// PUT /api/scenarios/:id — Szenario aktualisieren
router.put('/:id', (req, res) => {
  const { name, config, result, stats } = req.body;
  const existing = db.prepare('SELECT id FROM scenarios WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Szenario nicht gefunden' });

  db.prepare(`
    UPDATE scenarios
    SET name = COALESCE(?, name),
        config = COALESCE(?, config),
        result = COALESCE(?, result),
        stats = COALESCE(?, stats),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || null,
    config ? JSON.stringify(config) : null,
    result ? JSON.stringify(result) : null,
    stats ? JSON.stringify(stats) : null,
    req.params.id
  );

  res.json({ id: Number(req.params.id), updated: true });
});

// DELETE /api/scenarios/:id — Szenario loeschen
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM scenarios WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Szenario nicht gefunden' });
  res.json({ deleted: true });
});

export default router;
