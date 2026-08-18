import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db.js";

let app: Express;

beforeEach(() => {
  const db = createDb(":memory:");
  app = createApp(db);
});

describe("POST /notes", () => {
  it("creates a note", async () => {
    const res = await request(app).post("/notes").send({ title: "Groceries", body: "Milk, eggs" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Groceries", body: "Milk, eggs" });
    expect(res.body.id).toBeTypeOf("number");
  });

  it("rejects a note without a title", async () => {
    const res = await request(app).post("/notes").send({ body: "no title" });
    expect(res.status).toBe(400);
  });
});

describe("GET /notes", () => {
  it("lists created notes in order", async () => {
    await request(app).post("/notes").send({ title: "One" });
    await request(app).post("/notes").send({ title: "Two" });
    const res = await request(app).get("/notes");
    expect(res.status).toBe(200);
    expect(res.body.map((n: { title: string }) => n.title)).toEqual(["One", "Two"]);
  });
});

describe("GET /notes/:id", () => {
  it("returns a single note", async () => {
    const created = await request(app).post("/notes").send({ title: "Find me" });
    const res = await request(app).get(`/notes/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Find me");
  });

  it("404s for a missing note", async () => {
    const res = await request(app).get("/notes/999");
    expect(res.status).toBe(404);
  });
});

describe("DELETE /notes/:id", () => {
  it("deletes an existing note", async () => {
    const created = await request(app).post("/notes").send({ title: "Delete me" });
    const res = await request(app).delete(`/notes/${created.body.id}`);
    expect(res.status).toBe(204);
    const after = await request(app).get(`/notes/${created.body.id}`);
    expect(after.status).toBe(404);
  });

  it("404s deleting a missing note", async () => {
    const res = await request(app).delete("/notes/999");
    expect(res.status).toBe(404);
  });
});
