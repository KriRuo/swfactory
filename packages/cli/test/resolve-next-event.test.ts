import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AgentRun, Evidence, Requirement } from "@sfai/artifacts";
import { git, initProductTree, writeArtifact } from "@sfai/orchestrator";
import { resolveNextEvent } from "../src/resolve-next-event.js";

let repoRoot: string;

beforeEach(async () => {
  repoRoot = mkdtempSync(join(tmpdir(), "sfai-cli-"));
  await git(repoRoot, ["init"]);
  await git(repoRoot, ["config", "user.name", "Test Runner"]);
  await git(repoRoot, ["config", "user.email", "test@example.invalid"]);
  initProductTree(repoRoot);
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const now = "2026-08-18T12:00:00.000Z";
const baseFields = { version: 1, createdAt: now, modifiedAt: now, relationships: [] as never[] };

describe("resolveNextEvent", () => {
  it("resolves the next event from the requirement's originating AgentRun", async () => {
    const agentRun: AgentRun = {
      ...baseFields,
      id: "AGENTRUN-0001",
      type: "agent-run",
      state: "succeeded",
      createdBy: "orchestrator",
      modifiedBy: "orchestrator",
      provenance: { source: "orchestrator", reason: "run completed" },
      agentRole: "product-re",
      trigger: "EvidenceAdded",
      inputSnapshotRef: "event:1",
      action: "Propose a use case and requirement from this evidence",
      toolPermissions: ["Read", "Write"],
      nextEvents: ["RequirementApproved"],
    };
    await writeArtifact(repoRoot, agentRun, "body");

    const requirement: Requirement = {
      ...baseFields,
      id: "REQ-0001",
      type: "requirement",
      state: "proposed",
      createdBy: "agent:AGENTRUN-0001",
      modifiedBy: "agent:AGENTRUN-0001",
      provenance: { source: "product-re-agent", reason: "derived from evidence" },
      approvalStatus: "pending",
      statement: "The system must allow searching notes by title.",
      priority: "must",
    };
    await writeArtifact(repoRoot, requirement, "body");

    const event = resolveNextEvent(repoRoot, "requirement", "REQ-0001", "human:kris");
    expect(event.type).toBe("RequirementApproved");
    expect(event.actor).toBe("human:kris");
  });

  it("throws when the artifact wasn't created by an agent run", async () => {
    const evidence: Evidence = {
      ...baseFields,
      id: "EVID-0001",
      type: "evidence",
      state: "new",
      createdBy: "human:kris",
      modifiedBy: "human:kris",
      provenance: { source: "user-submission", reason: "capture" },
      kind: "observation",
      summary: "submitted directly by a human, not produced by an agent run",
    };
    await writeArtifact(repoRoot, evidence, "body");

    expect(() => resolveNextEvent(repoRoot, "evidence", "EVID-0001", "human:kris")).toThrow(
      /no agent-run provenance/
    );
  });
});
