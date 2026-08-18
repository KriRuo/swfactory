import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Evidence, Requirement, Slice, UseCase, VerificationResult } from "@sfai/artifacts";
import { initProductTree, writeArtifact } from "../src/product-state.js";
import { appendEvent, openEventLog, readEvents, type EventInput } from "../src/event-log.js";
import {
  approveArtifact,
  completeAgentRun,
  pendingAgentRuns,
  pendingApprovals,
  scheduleAgentRun,
  type ScheduledRun,
} from "../src/orchestrator.js";
import type { EventType } from "../src/policy.js";
import { git } from "../src/git.js";

let repoRoot: string;
let log: DatabaseSync;

beforeEach(async () => {
  repoRoot = mkdtempSync(join(tmpdir(), "sfai-orchestrator-"));
  await git(repoRoot, ["init"]);
  await git(repoRoot, ["config", "user.name", "Test Runner"]);
  await git(repoRoot, ["config", "user.email", "test@example.invalid"]);
  initProductTree(repoRoot);
  log = openEventLog(":memory:");
});

afterEach(() => {
  // maxRetries/retryDelay work around transient EPERM/EBUSY on Windows right
  // after a burst of git subprocess writes (AV/indexer holding a handle).
  rmSync(repoRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** Append an event and let the orchestrator react to it — the pattern a real dispatch loop follows. */
async function emit(eventInput: EventInput & { type: EventType }): Promise<ScheduledRun | null> {
  const id = appendEvent(log, eventInput);
  return scheduleAgentRun(repoRoot, log, { id, ts: new Date().toISOString(), ...eventInput });
}

/** React to whatever event `completeAgentRun`/`approveArtifact` just appended, without re-appending it. */
async function reactToLatest(): Promise<ScheduledRun | null> {
  const latest = readEvents(log).at(-1);
  if (!latest) throw new Error("no events logged yet");
  return scheduleAgentRun(repoRoot, log, latest);
}

const now = "2026-08-18T12:00:00.000Z";
const baseFields = {
  version: 1,
  createdAt: now,
  modifiedAt: now,
  relationships: [] as never[],
};

describe("milestone-1 happy path", () => {
  it("flows from EvidenceAdded through to Integrated with no LLM involved", { timeout: 30000 }, async () => {
    // 1. Human submits a need.
    const evidence: Evidence = {
      ...baseFields,
      id: "EVID-0001",
      type: "evidence",
      state: "new",
      createdBy: "human:kris",
      modifiedBy: "human:kris",
      provenance: { source: "user-submission", reason: "capture initial need" },
      kind: "stakeholder-input",
      summary: "Users can't find old notes once the list grows past a screenful.",
    };
    await writeArtifact(repoRoot, evidence, "Reported via support ticket #42.");

    const productReRun = await emit({
      type: "EvidenceAdded",
      payload: { evidenceId: evidence.id },
      actor: "human:kris",
    });
    expect(productReRun?.agentRun.agentRole).toBe("product-re");
    expect(pendingAgentRuns(repoRoot)).toHaveLength(1);

    // 2. Product/RE "completes" (simulated) — proposes a use case + requirement, both awaiting approval.
    const useCase: UseCase = {
      ...baseFields,
      id: "USECASE-0001",
      type: "use-case",
      state: "proposed",
      createdBy: `agent:${productReRun!.agentRun.id}`,
      modifiedBy: `agent:${productReRun!.agentRun.id}`,
      provenance: { source: "product-re-agent", reason: "derived from evidence" },
      relationships: [{ type: "derivedFrom", targetId: evidence.id }],
      title: "Search notes by title",
      actors: ["Notes API user"],
      goal: "Find a specific note without scrolling the full list.",
    };
    const requirement: Requirement = {
      ...baseFields,
      id: "REQ-0001",
      type: "requirement",
      state: "proposed",
      createdBy: `agent:${productReRun!.agentRun.id}`,
      modifiedBy: `agent:${productReRun!.agentRun.id}`,
      provenance: { source: "product-re-agent", reason: "derived from evidence" },
      relationships: [{ type: "derivedFrom", targetId: useCase.id }],
      approvalStatus: "pending",
      statement: "The system must allow searching notes by title.",
      priority: "must",
    };
    await completeAgentRun(repoRoot, log, productReRun!.agentRun.id, {
      output: "Proposed USECASE-0001 and REQ-0001.",
      producedArtifacts: [useCase, requirement],
      // No autoAdvanceEvent: EvidenceAdded is an L2 stage — must wait for approveArtifact.
    });
    expect(pendingApprovals(repoRoot).map((a) => a.id)).toEqual(["REQ-0001"]);

    // 3. Human approves the requirement — the only pre-integration human checkpoint in this flow.
    await approveArtifact(repoRoot, log, {
      type: "requirement",
      id: requirement.id,
      approver: "human:kris",
      nextEvent: { type: "RequirementApproved", payload: { requirementId: requirement.id }, actor: "human:kris" },
    });
    const archPlanningRun = await reactToLatest();
    expect(archPlanningRun?.agentRun.agentRole).toBe("architecture-planning");

    // 4. Architecture/Planning auto-advances (L3) — produces an approved slice.
    const slice: Slice = {
      ...baseFields,
      id: "SLICE-0001",
      type: "slice",
      state: "approved",
      createdBy: `agent:${archPlanningRun!.agentRun.id}`,
      modifiedBy: `agent:${archPlanningRun!.agentRun.id}`,
      provenance: { source: "architecture-planning-agent", reason: "planned from approved requirement" },
      relationships: [{ type: "implements", targetId: requirement.id }],
      title: "Add title search to the notes API",
      approach: "Add a `q` query param to GET /notes that filters by title substring.",
      affectedComponents: ["fixtures/seed-app"],
      dependencies: [],
      testIntent: "GET /notes?q=milk returns only notes whose title contains 'milk'.",
    };
    await completeAgentRun(repoRoot, log, archPlanningRun!.agentRun.id, {
      output: "Planned SLICE-0001.",
      producedArtifacts: [slice],
      autoAdvanceEvent: { type: "SliceApproved", payload: { sliceId: slice.id }, actor: `agent:${archPlanningRun!.agentRun.id}` },
    });
    const engineeringRun = await reactToLatest();
    expect(engineeringRun?.agentRun.agentRole).toBe("engineering");

    // 5. Engineering auto-advances (L3) — implementation itself isn't a /product artifact in this model.
    await completeAgentRun(repoRoot, log, engineeringRun!.agentRun.id, {
      output: "Implemented the search filter on a worktree branch.",
      autoAdvanceEvent: { type: "ImplementationCompleted", payload: { sliceId: slice.id }, actor: `agent:${engineeringRun!.agentRun.id}` },
    });
    const verificationRun = await reactToLatest();
    expect(verificationRun?.agentRun.agentRole).toBe("verification");

    // 6. Verification auto-advances (L3) — produces evidence awaiting the Merge Gate.
    const verificationResult: VerificationResult = {
      ...baseFields,
      id: "VERIF-0001",
      type: "verification-result",
      state: "recorded",
      createdBy: `agent:${verificationRun!.agentRun.id}`,
      modifiedBy: `agent:${verificationRun!.agentRun.id}`,
      provenance: { source: "verification-agent", reason: "ran acceptance tests" },
      relationships: [{ type: "verifies", targetId: slice.id }],
      approvalStatus: "pending",
      method: "automated-test",
      outcome: "pass",
      evidenceRefs: [],
      details: "GET /notes?q=milk returned exactly the matching notes.",
    };
    await completeAgentRun(repoRoot, log, verificationRun!.agentRun.id, {
      output: "Verification passed.",
      producedArtifacts: [verificationResult],
      autoAdvanceEvent: {
        type: "VerificationPassed",
        payload: { verificationResultId: verificationResult.id },
        actor: `agent:${verificationRun!.agentRun.id}`,
      },
    });
    const mergeGateSchedule = await reactToLatest();
    expect(mergeGateSchedule).toBeNull(); // pure gate — no agent to dispatch
    expect(pendingApprovals(repoRoot).map((a) => a.id)).toEqual(["VERIF-0001"]);

    // 7. Human approves integration — the loop's terminal event.
    await approveArtifact(repoRoot, log, {
      type: "verification-result",
      id: verificationResult.id,
      approver: "human:kris",
      nextEvent: { type: "Integrated", payload: { sliceId: slice.id }, actor: "human:kris" },
    });

    expect(pendingApprovals(repoRoot)).toHaveLength(0);
    expect(pendingAgentRuns(repoRoot)).toHaveLength(0);

    const eventTypes = readEvents(log).map((e) => e.type);
    expect(eventTypes.at(-1)).toBe("Integrated");
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        "EvidenceAdded",
        "RequirementApproved",
        "SliceApproved",
        "ImplementationCompleted",
        "VerificationPassed",
      ])
    );

    // Every write is its own commit — history is never overwritten in place.
    const commitLog = await git(repoRoot, ["log", "--oneline"]);
    const commitCount = commitLog.split("\n").filter(Boolean).length;
    expect(commitCount).toBeGreaterThanOrEqual(12);
  });
});

describe("edge cases", () => {
  it("scheduleAgentRun is a no-op for an event with no policy entry (e.g. the terminal event)", async () => {
    const result = await emit({ type: "Integrated", payload: {}, actor: "test" });
    expect(result).toBeNull();
  });

  it("approveArtifact throws when the artifact isn't pending", async () => {
    const evidence: Evidence = {
      ...baseFields,
      id: "EVID-0002",
      type: "evidence",
      state: "new",
      createdBy: "human:kris",
      modifiedBy: "human:kris",
      provenance: { source: "user-submission", reason: "capture" },
      kind: "observation",
      summary: "no approvalStatus set",
    };
    await writeArtifact(repoRoot, evidence, "body");

    await expect(
      approveArtifact(repoRoot, log, {
        type: "evidence",
        id: evidence.id,
        approver: "human:kris",
        nextEvent: { type: "RequirementApproved", payload: {}, actor: "human:kris" },
      })
    ).rejects.toThrow(/not pending approval/);
  });
});
