import { describe, expect, it } from "vitest";
import { evidenceSchema, requirementSchema } from "../src/index.js";

const baseFields = {
  id: "EVID-0001",
  version: 1,
  createdAt: "2026-08-18T12:00:00.000Z",
  modifiedAt: "2026-08-18T12:00:00.000Z",
  createdBy: "agent:AGENTRUN-0001",
  modifiedBy: "agent:AGENTRUN-0001",
  provenance: { source: "user-submission", reason: "initial capture" },
  relationships: [],
};

describe("evidenceSchema", () => {
  it("accepts a valid evidence artifact", () => {
    const result = evidenceSchema.parse({
      ...baseFields,
      type: "evidence",
      state: "new",
      kind: "stakeholder-input",
      summary: "User reported the notes API needs a search endpoint.",
    });
    expect(result.kind).toBe("stakeholder-input");
  });

  it("rejects an unknown state", () => {
    expect(() =>
      evidenceSchema.parse({
        ...baseFields,
        type: "evidence",
        state: "not-a-real-state",
        kind: "observation",
        summary: "x",
      })
    ).toThrow();
  });

  it("rejects a missing provenance.reason", () => {
    expect(() =>
      evidenceSchema.parse({
        ...baseFields,
        provenance: { source: "user-submission" },
        type: "evidence",
        state: "new",
        kind: "observation",
        summary: "x",
      })
    ).toThrow();
  });
});

describe("requirementSchema", () => {
  it("accepts a valid requirement with relationships", () => {
    const result = requirementSchema.parse({
      ...baseFields,
      id: "REQ-0001",
      type: "requirement",
      state: "proposed",
      statement: "The system must allow searching notes by title.",
      priority: "must",
      relationships: [{ type: "derivedFrom", targetId: "USECASE-0001" }],
    });
    expect(result.relationships).toHaveLength(1);
  });

  it("rejects an invalid confidence value", () => {
    expect(() =>
      requirementSchema.parse({
        ...baseFields,
        id: "REQ-0002",
        type: "requirement",
        state: "proposed",
        statement: "x",
        priority: "must",
        confidence: 1.5,
      })
    ).toThrow();
  });
});
