import express, { type Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import type { Note } from "./db.js";

export function createApp(db: DatabaseSync): Express {
  const app = express();
  app.use(express.json());

  app.post("/notes", (req, res) => {
    const { title, body } = req.body ?? {};
    if (typeof title !== "string" || title.trim() === "") {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const createdAt = new Date().toISOString();
    const result = db
      .prepare("INSERT INTO notes (title, body, createdAt) VALUES (?, ?, ?)")
      .run(title, typeof body === "string" ? body : "", createdAt);
    const note = db
      .prepare("SELECT * FROM notes WHERE id = ?")
      .get(result.lastInsertRowid) as unknown as Note;
    res.status(201).json(note);
  });

  app.get("/notes", (_req, res) => {
    const notes = db.prepare("SELECT * FROM notes ORDER BY id").all();
    res.json(notes);
  });

  app.get("/notes/:id", (req, res) => {
    const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id) as unknown as
      | Note
      | undefined;
    if (!note) {
      res.status(404).json({ error: "note not found" });
      return;
    }
    res.json(note);
  });

  app.delete("/notes/:id", (req, res) => {
    const result = db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: "note not found" });
      return;
    }
    res.status(204).end();
  });

  return app;
}
