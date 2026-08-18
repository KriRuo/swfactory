import { DatabaseSync } from "node:sqlite";

/**
 * Uses Node's built-in `node:sqlite` module rather than `better-sqlite3` —
 * same "file-based, no external DB service" requirement, but no native
 * compile step (avoids node-gyp/Visual Studio Build Tools on Windows).
 */
export function createDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    )
  `);
  return db;
}

export interface Note {
  id: number;
  title: string;
  body: string;
  createdAt: string;
}
