// SPEngine SQLite Database Connection (sql.js — pure WASM, no native build)
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import log from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, 'spengine.sqlite');

// Ensure db directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

// Initialize sql.js
const SQL = await initSqlJs();

// Load existing DB or create new
let db;
if (existsSync(DB_PATH)) {
  const buffer = readFileSync(DB_PATH);
  db = new SQL.Database(buffer);
  console.log(`[DB] Loaded existing database: ${DB_PATH}`);
} else {
  db = new SQL.Database();
  console.log(`[DB] Created new database: ${DB_PATH}`);
}

// Initialize schema
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.run(schema);

// Auto-save to disk after writes
let _saveTimer = null;
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const data = db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
  }, 500);
}

// Wrapper to match better-sqlite3 API used by routes
const wrapper = {
  prepare(sql) {
    return {
      all(...params) {
        const t0 = Date.now();
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        log.db(sql, params, { rows: rows.length }, Date.now() - t0);
        return rows;
      },
      get(...params) {
        const t0 = Date.now();
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const row = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        log.db(sql, params, { found: row !== undefined }, Date.now() - t0);
        return row;
      },
      run(...params) {
        const t0 = Date.now();
        db.run(sql, params);
        scheduleSave();
        const changes = db.getRowsModified();
        const lastInsertRowid = wrapper._lastId();
        log.db(sql, params, { changes, lastInsertRowid }, Date.now() - t0);
        return { changes, lastInsertRowid };
      }
    };
  },

  exec(sql) {
    db.run(sql);
    scheduleSave();
  },

  _lastId() {
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const id = stmt.getAsObject().id;
    stmt.free();
    return id;
  },

  // Save to disk immediately (call on shutdown)
  flush() {
    if (_saveTimer) clearTimeout(_saveTimer);
    const data = db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
    console.log('[DB] Flushed to disk');
  }
};

// Save on exit
process.on('SIGINT', () => { wrapper.flush(); process.exit(0); });
process.on('SIGTERM', () => { wrapper.flush(); process.exit(0); });

console.log(`[DB] SQLite ready (sql.js WASM)`);

export default wrapper;
