-- SPEngine Database Schema

CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    config TEXT NOT NULL,           -- JSON: optimizer config
    result TEXT,                    -- JSON: portfolio result (bond array)
    stats TEXT,                     -- JSON: KPI statistics
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '',
    config TEXT NOT NULL,           -- JSON: preset configuration
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS universe_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bonds TEXT NOT NULL,            -- JSON: bond array
    bond_count INTEGER DEFAULT 0,
    source_file TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,            -- JSON value
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL,              -- JSON: full session state (portfolio, constraints, scenarios)
    bond_count INTEGER DEFAULT 0,   -- Anzahl Anleihen im Portfolio
    scenario_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_scenarios_name ON scenarios(name);
CREATE INDEX IF NOT EXISTS idx_scenarios_updated ON scenarios(updated_at);
CREATE INDEX IF NOT EXISTS idx_presets_name ON presets(name);
