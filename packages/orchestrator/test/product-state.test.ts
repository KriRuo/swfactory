import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Evidence, UseCase } from "@sfai/artifacts";
import { buildRelationshipGraph, initProductTree, listArtifacts, writeArtifact } from "../src/product-state.js";
import { git } from "../src/git.js";

let repoRoot: string;

beforeEach(async () => {
  repoRoot = mkdtempSync(join(tmpdir(), "sfai-product-state-"));
  await git(repoRoot, ["init"]);
  // Local identity so this test doesn't depend on the host's global git config.
  await git(repoRoot, ["config", "user.name", "Test Runner"]);
  await git(repoRoot, ["config", "user.email", "test@example.invalid"]);
  initProductTree(repoRoot);
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
});

const evidence: Evidence = {
  id: "EVID-0001",
  type: "evidence",
  state: "new",
  version: 1,
  createdAt: "2026-08-18T12:00:00.000Z",
  modifiedAt: "2026-08-18T12:00:00.000Z",
  createdBy: "human:kris",
  modifiedBy: "human:kris",
  provenance: { source: "user-submission", reason: "capture initial need" },
  relationships: [],
  kind: "stakeholder-input",
  summary: "Users can't find old notes once the list grows past a screenful.",
};

function useCaseFor(evidenceId: string): UseCase {
  return {
    id: "USECASE-0001",
    type: "use-case",
    state: "draft",
    version: 1,
    createdAt: "2026-08-18T12:05:00.000Z",
    modifiedAt: "2026-08-18T12:05:00.000Z",
    createdBy: "agent:AGENTRUN-0001",
    modifiedBy: "agent:AGENTRUN-0001",
    provenance: { source: "product-re-agent", reason: "derived from evidence" },
    relationships: [{ type: "derivedFrom", targetId: evidenceId }],
    title: "Search notes by title",
    actors: ["Notes API user"],
    goal: "Find a specific note without scrolling the full list.",
  };
}

describe("writeArtifact", () => {
  it("writes the file under the correct /product folder and commits it", async () => {
    const result = await writeArtifact(repoRoot, evidence, "Reported via support ticket #42.");
    expect(result.filePath).toContain(join("product", "evidence", "EVID-0001.md"));
    expect(result.commitHash).toMatch(/^[0-9a-f]{40}$/);

    const log = await git(repoRoot, ["log", "--oneline"]);
    expect(log).toContain("evidence(EVID-0001)");
  });

  it("does not overwrite history — each write is its own commit", async () => {
    await writeArtifact(repoRoot, evidence, "body");
    await writeArtifact(repoRoot, useCaseFor(evidence.id), "body");

    const log = await git(repoRoot, ["log", "--oneline"]);
    const commitCount = log.split("\n").filter(Boolean).length;
    expect(commitCount).toBe(2);
  });
});

describe("buildRelationshipGraph", () => {
  it("traces a use case back to the evidence it was derived from", async () => {
    await writeArtifact(repoRoot, evidence, "body");
    await writeArtifact(repoRoot, useCaseFor(evidence.id), "body");

    const graph = buildRelationshipGraph(repoRoot);

    expect(graph.outgoing.get("USECASE-0001")).toEqual([
      { type: "derivedFrom", targetId: "EVID-0001" },
    ]);
    expect(graph.incoming.get("EVID-0001")).toEqual(["USECASE-0001"]);
  });
});

describe("listArtifacts", () => {
  it("filters by type", async () => {
    await writeArtifact(repoRoot, evidence, "body");
    await writeArtifact(repoRoot, useCaseFor(evidence.id), "body");

    expect(listArtifacts(repoRoot, "evidence")).toHaveLength(1);
    expect(listArtifacts(repoRoot, "use-case")).toHaveLength(1);
    expect(listArtifacts(repoRoot)).toHaveLength(2);
  });
});
