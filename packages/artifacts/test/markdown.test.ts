import { describe, expect, it } from "vitest";
import { parseArtifactFile, serializeArtifactFile, type UseCase } from "../src/index.js";

const useCase: UseCase = {
  id: "USECASE-0001",
  type: "use-case",
  state: "draft",
  version: 1,
  createdAt: "2026-08-18T12:00:00.000Z",
  modifiedAt: "2026-08-18T12:00:00.000Z",
  createdBy: "agent:AGENTRUN-0001",
  modifiedBy: "agent:AGENTRUN-0001",
  provenance: { source: "user-submission", reason: "initial capture" },
  relationships: [{ type: "derivedFrom", targetId: "EVID-0001" }],
  title: "Search notes by title",
  actors: ["Notes API user"],
  goal: "Let a user find a note without scrolling through the full list.",
};

describe("markdown round-trip", () => {
  it("serializes and re-parses to an equivalent artifact", () => {
    const body = "## Scenario\n\nGiven a set of notes, when the user searches by title, ...";
    const raw = serializeArtifactFile(useCase, body);

    expect(raw).toContain("type: use-case");
    expect(raw).toContain("## Scenario");

    const parsed = parseArtifactFile(raw);
    expect(parsed.data).toEqual(useCase);
    expect(parsed.body).toBe(body);
  });

  it("throws on an unknown artifact type", () => {
    const raw = "---\ntype: not-a-real-type\nid: X-1\n---\nbody";
    expect(() => parseArtifactFile(raw)).toThrow(/Unknown or missing artifact "type"/);
  });

  it("throws when frontmatter fails schema validation", () => {
    const raw = "---\ntype: use-case\nid: USECASE-0002\n---\nbody";
    expect(() => parseArtifactFile(raw)).toThrow();
  });
});
