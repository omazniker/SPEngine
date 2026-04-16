// ═══ SPEngine Structured Logger ═══
// JSON-Logs nach stdout UND /app/logs/spengine.log
// Format: { ts, level, cat, ...fields }

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR  = process.env.LOG_DIR || join(__dirname, '../logs');
const LOG_FILE = join(LOG_DIR, 'spengine.log');

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

function write(entry) {
  const line = JSON.stringify(entry) + '\n';
  process.stdout.write(line);
  try { appendFileSync(LOG_FILE, line); } catch (_) {}
}

function ts() { return new Date().toISOString(); }

// ─── Hilfsfunktionen für kompakte Body-Summaries ──────────────────────────

// Kürzt Bond-Arrays auf Zähler, damit Logs nicht riesig werden
function summarize(val, depth = 0) {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    if (val.length === 0) return [];
    // Tiefe Arrays (Bond-Daten) nur als Länge
    if (depth >= 2) return `[Array(${val.length})]`;
    return val.slice(0, 3).map(v => summarize(v, depth + 1))
      .concat(val.length > 3 ? [`…+${val.length - 3} more`] : []);
  }
  const out = {};
  for (const [k, v] of Object.entries(val)) {
    if (['data', 'bonds', 'result', 'config', 'state'].includes(k) && typeof v === 'object' && v !== null) {
      if (Array.isArray(v)) out[k] = `[Array(${v.length})]`;
      else out[k] = `{Object(${Object.keys(v).length} keys)}`;
    } else {
      out[k] = summarize(v, depth + 1);
    }
  }
  return out;
}

function bodySize(body) {
  try { return Buffer.byteLength(JSON.stringify(body)); } catch { return 0; }
}

// ─── Public API ───────────────────────────────────────────────────────────

const log = {
  info(cat, fields) {
    write({ ts: ts(), level: 'INFO', cat, ...fields });
  },

  error(cat, fields) {
    write({ ts: ts(), level: 'ERROR', cat, ...fields });
  },

  db(sql, params, result, ms) {
    // Kürze SQL auf erste 120 Zeichen
    const shortSql = sql.replace(/\s+/g, ' ').trim().slice(0, 120);
    // Params: ersetze große Strings durch Größenangabe
    const shortParams = (params || []).map(p =>
      typeof p === 'string' && p.length > 200 ? `[String(${p.length})]` : p
    );
    write({ ts: ts(), level: 'DB', cat: 'SQL', sql: shortSql, params: shortParams, ...result, ms });
  },

  // Request-Start (wird in middleware gerufen)
  reqStart(req) {
    const bodySum = req.body ? summarize(req.body) : undefined;
    const entry = {
      ts: ts(), level: 'REQ', cat: 'HTTP',
      id: req._logId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query || {}).length ? req.query : undefined,
      ip: req.ip || req.headers['x-forwarded-for'],
      bodySize: bodySize(req.body),
      body: bodySum,
    };
    write(entry);
  },

  // Response-Ende (path/method werden vom Aufrufer übergeben, da Express req.path ändert)
  reqEnd(method, path, id, statusCode, ms) {
    write({ ts: ts(), level: 'RES', cat: 'HTTP', id, method, path, status: statusCode, ms });
  },
};

export default log;
