
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const globalForDb = globalThis as typeof globalThis & {
  sciDb?: Database.Database;
};

export function getDb(): Database.Database {
  if (globalForDb.sciDb?.open) {
    return globalForDb.sciDb;
  }

  const dbPath = process.env.DATABASE_PATH || './data/sci.db';
  const absolute = path.resolve(dbPath);

  fs.mkdirSync(path.dirname(absolute), { recursive: true });

  const database = new Database(absolute, {
    timeout: 10000,
  });

  try {
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');

    database.exec(`
      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        url TEXT,
        external_id TEXT,
        access_token_enc TEXT,
        token_expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS content_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        external_id TEXT NOT NULL,
        canonical_url TEXT,
        title TEXT,
        body TEXT,
        published_at TEXT,
        collected_at TEXT DEFAULT CURRENT_TIMESTAMP,
        content_hash TEXT NOT NULL,
        metadata_json TEXT DEFAULT '{}',
        UNIQUE(source_id, external_id),
        FOREIGN KEY(source_id) REFERENCES sources(id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
      );
    `);

    globalForDb.sciDb = database;
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
