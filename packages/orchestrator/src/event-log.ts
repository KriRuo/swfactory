import { DatabaseSync } from "node:sqlite";

/**
 * Append-only event log. This is the durable primitive from build-sequence
 * step 3 only — no state machine or event handlers sit on top of it yet
 * (that's step 4, out of scope for this phase). On startup, a later phase
 * rebuilds orchestrator state by replaying `readEvents()` in order.
 */
export function openEventLog(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      actor TEXT NOT NULL
    )
  `);
  return db;
}

export interface EventInput {
  type: string;
  payload: unknown;
  actor: string;
}

export interface StoredEvent {
  id: number;
  ts: string;
  type: string;
  payload: unknown;
  actor: string;
}

export function appendEvent(db: DatabaseSync, event: EventInput): number {
  const ts = new Date().toISOString();
  const result = db
    .prepare("INSERT INTO events (ts, type, payload, actor) VALUES (?, ?, ?, ?)")
    .run(ts, event.type, JSON.stringify(event.payload), event.actor);
  return Number(result.lastInsertRowid);
}

export function readEvents(db: DatabaseSync, opts?: { type?: string }): StoredEvent[] {
  const rows = (
    opts?.type
      ? db.prepare("SELECT * FROM events WHERE type = ? ORDER BY id").all(opts.type)
      : db.prepare("SELECT * FROM events ORDER BY id").all()
  ) as Array<{ id: number; ts: string; type: string; payload: string; actor: string }>;

  return rows.map((row) => ({
    ...row,
    payload: JSON.parse(row.payload),
  }));
}
