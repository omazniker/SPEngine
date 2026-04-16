// Session CRUD API
import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/sessions — Liste aller Sitzungen (ohne data, nur Metadaten)
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, bond_count, scenario_count, created_at, updated_at
    FROM sessions
    ORDER BY updated_at DESC
  `).all();
  res.json(rows);
});

// GET /api/sessions/:id — Einzelne Sitzung mit vollen Daten
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Sitzung nicht gefunden' });
  row.data = JSON.parse(row.data || '{}');
  res.json(row);
});

// POST /api/sessions — Neue Sitzung speichern
router.post('/', (req, res) => {
  const { name, data } = req.body;
  if (!name || !data) return res.status(400).json({ error: 'Name und Daten sind erforderlich' });

  const st = data.state || data;
  const bonds = st.lastPortfolio || st.portfolio || (st.datasets?.[0]?.data) || [];
  const bond_count = Array.isArray(bonds) ? bonds.length : 0;
  const scenario_count = Array.isArray(st.scenarios) ? st.scenarios.length : 0;

  const info = db.prepare(`
    INSERT INTO sessions (name, data, bond_count, scenario_count)
    VALUES (?, ?, ?, ?)
  `).run(name, JSON.stringify(data), bond_count, scenario_count);

  res.status(201).json({ id: info.lastInsertRowid, name, bond_count, scenario_count });
});

// PUT /api/sessions/:id — Sitzung aktualisieren (oder anlegen falls nicht vorhanden)
router.put('/:id', (req, res) => {
  const { name, data } = req.body;
  const existing = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.id);

  const st = data?.state || data || {};
  const bonds = st.lastPortfolio || st.portfolio || (st.datasets?.[0]?.data) || [];
  const bond_count = Array.isArray(bonds) ? bonds.length : undefined;
  const scenario_count = Array.isArray(st.scenarios) ? st.scenarios.length : undefined;

  if (!existing) {
    db.prepare(`
      INSERT INTO sessions (id, name, data, bond_count, scenario_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.params.id,
      name || 'Importierte Sitzung',
      data ? JSON.stringify(data) : null,
      bond_count ?? null,
      scenario_count ?? null
    );
    return res.json({ id: Number(req.params.id), created: true });
  }

  db.prepare(`
    UPDATE sessions
    SET name = COALESCE(?, name),
        data = COALESCE(?, data),
        bond_count = COALESCE(?, bond_count),
        scenario_count = COALESCE(?, scenario_count),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || null,
    data ? JSON.stringify(data) : null,
    bond_count ?? null,
    scenario_count ?? null,
    req.params.id
  );

  res.json({ id: Number(req.params.id), updated: true });
});

// DELETE /api/sessions/:id — Sitzung loeschen
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Sitzung nicht gefunden' });
  res.json({ deleted: true });
});

export default router;
