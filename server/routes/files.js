// File listing API — listet verfuegbare Datendateien (xlsx, csv)
import { Router } from 'express';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const router = Router();

const DATA_DIR = process.env.DATA_DIR || '/app/data';

// GET /api/files — Liste verfuegbarer Datendateien
router.get('/', (req, res) => {
  try {
    const files = readdirSync(DATA_DIR)
      .filter(f => /\.(xlsx|csv|json)$/i.test(f))
      .map(f => {
        const stat = statSync(join(DATA_DIR, f));
        return {
          name: f,
          url: `/data/${f}`,
          size: stat.size,
          modified: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));

    res.json(files);
  } catch (err) {
    // Falls DATA_DIR nicht existiert oder nicht lesbar ist
    res.json([]);
  }
});

export default router;
