CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  google_sub TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conteudo TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('texto', 'voz', 'foto'))
);

CREATE TABLE IF NOT EXISTS sessoes_processamento (
  session_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  status TEXT NOT NULL,
  items TEXT NOT NULL,
  item_atual INTEGER NOT NULL DEFAULT 0
);