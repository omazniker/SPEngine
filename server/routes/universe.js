// Universe Profile API
import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/universe — Alle Profile (ohne Bond-Daten, nur Metadaten)
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, bond_count, source_file, created_at
    FROM universe_profiles
    ORDER BY created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/universe/:id — Einzelnes Profil mit Bonds
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM universe_profiles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Profil nicht gefunden' });
  row.bonds = JSON.parse(row.bonds || '[]');
  res.json(row);
});

// POST /api/universe — Neues Profil speichern
router.post('/', (req, res) => {
  const { name, bonds, source_file } = req.body;
  if (!name || !bonds) return res.status(400).json({ error: 'Name und Bonds sind erforderlich' });

  const info = db.prepare(`
    INSERT INTO universe_profiles (name, bonds, bond_count, source_file)
    VALUES (?, ?, ?, ?)
  `).run(name, JSON.stringify(bonds), bonds.length, source_file || null);

  res.status(201).json({ id: info.lastInsertRowid, name, bond_count: bonds.length });
});

// DELETE /api/universe/:id — Profil loeschen
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM universe_profiles WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Profil nicht gefunden' });
  res.json({ deleted: true });
});

export default router;
