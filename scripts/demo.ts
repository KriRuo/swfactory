/**
 * Runs the milestone-1 happy path against a real, inspectable folder
 * (./demo-run) instead of a throwaway temp dir like the test suite uses.
 * Agent outputs are fabricated here, standing in for the Product/RE,
 * Architecture/Planning, Engineering, and Verification agents, which don't
 * exist yet (build-sequence steps 5-8). This is the same sequence as
 * packages/orchestrator/test/orchestrator.test.ts, narrated to stdout.
 *
 * Run with `npm run demo` from the repo root. Afterwards:
 *   cd demo-run && git log --oneline
 *   cat demo-run/product/requirements/REQ-0001.md
 */
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Evidence, Requirement, Slice, UseCase, VerificationResult } from "@sfai/artifacts";
import {
  appendEvent,
  approveArtifact,
  completeAgentRun,
  git,
  initProductTree,
  openEventLog,
  pendingAgentRuns,
  pendingApprovals,
  readEvents,
  scheduleAgentRun,
  writeArtifact,
  type EventInput,
  type EventType,
  type ScheduledRun,
} from "@sfai/orchestrator";

const repoRoot = join(process.cwd(), "demo-run");
const now = () => new Date().toISOString();

/** Append an event and let the orchestrator react to it — the pattern a real dispatch loop follows. */
async function emit(log: DatabaseSync, event: EventInput & { type: EventType }): Promise<ScheduledRun | null> {
  const id = appendEvent(log, event);
  const scheduled = await scheduleAgentRun(repoRoot, log, { id, ts: now(), ...event });
  logScheduled(scheduled);
  return scheduled;
}

/** React to whatever event `completeAgentRun`/`approveArtifact` just appended, without re-appending it. */
async function reactToLatest(log: DatabaseSync): Promise<ScheduledRun | null> {
  const latest = readEvents(log).at(-1);
  if (!latest) throw new Error("no events logged yet");
  const scheduled = await scheduleAgentRun(repoRoot, log, latest);
  logScheduled(scheduled);
  return scheduled;
}

function logScheduled(scheduled: ScheduledRun | null) {
  if (scheduled) {
    console.log(`  -> scheduled ${scheduled.agentRun.agentRole} run ${scheduled.agentRun.id}: ${scheduled.agentRun.action}`);
  } else {
    console.log("  -> no agent to dispatch (pure gate or unpoliced event)");
  }
}

async function main() {
  console.log(`Resetting ${repoRoot} ...`);
  rmSync(repoRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  mkdirSync(repoRoot, { recursive: true });
  await git(repoRoot, ["init"]);
  await git(repoRoot, ["config", "user.name", "SoftwarefactoryAI Demo"]);
  await git(repoRoot, ["config", "user.email", "demo@softwarefactory.invalid"]);
  initProductTree(repoRoot);

  const log = openEventLog(":memory:");

  console.log("\n1. Human submits a need (Evidence).");
  const evidence: Evidence = {
    id: "EVID-0001",
    type: "evidence",
    state: "new",
    version: 1,
    createdAt: now(),
    modifiedAt: now(),
    createdBy: "human:kris",
    modifiedBy: "human:kris",
    provenance: { source: "user-submission", reason: "capture initial need" },
    relationships: [],
    kind: "stakeholder-input",
    summary: "Users can't find old notes once the list grows past a screenful.",
  };
  await writeArtifact(repoRoot, evidence, "Reported via support ticket #42.");
  const productReRun = await emit(log, {
    type: "EvidenceAdded",
    payload: { evidenceId: evidence.id },
    actor: "human:kris",
  });

  console.log("\n2. Product/RE (simulated) proposes a use case + requirement, awaiting approval.");
  const useCase: UseCase = {
    id: "USECASE-0001",
    type: "use-case",
    state: "proposed",
    version: 1,
    createdAt: now(),
    modifiedAt: now(),
    createdBy: `agent:${productReRun!.agentRun.id}`,
    modifiedBy: `agent:${productReRun!.agentRun.id}`,
    provenance: { source: "product-re-agent", reason: "derived from evidence" },
    relationships: [{ type: "derivedFrom", targetId: evidence.id }],
    title: "Search notes by title",
    actors: ["Notes API user"],
    goal: "Find a specific note without scrolling the full list.",
  };
  const requirement: Requirement = {
    id: "REQ-0001",
    type: "requirement",
    state: "proposed",
    version: 1,
    createdAt: now(),
    modifiedAt: now(),
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
  });
  console.log(`  -> pending approval: ${pendingApprovals(repoRoot).map((a) => a.id).join(", ")}`);

  console.log("\n3. Human approves the requirement (Intent Gate) - the only checkpoint before integration.");
  await approveArtifact(repoRoot, log, {
    type: "requirement",
    id: requirement.id,
    approver: "human:kris",
    nextEvent: { type: "RequirementApproved", payload: { requirementId: requirement.id }, actor: "human:kris" },
  });
  const archPlanningRun = await reactToLatest(log);

  console.log("\n4. Architecture/Planning (simulated) auto-advances (L3) - produces an approved slice.");
  const slice: Slice = {
    id: "SLICE-0001",
    type: "slice",
    state: "approved",
    version: 1,
    createdAt: now(),
    modifiedAt: now(),
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
  const engineeringRun = await reactToLatest(log);

  console.log("\n5. Engineering (simulated) auto-advances (L3) - code isn't a /product artifact in this model.");
  await completeAgentRun(repoRoot, log, engineeringRun!.agentRun.id, {
    output: "Implemented the search filter on a worktree branch.",
    autoAdvanceEvent: {
      type: "ImplementationCompleted",
      payload: { sliceId: slice.id },
      actor: `agent:${engineeringRun!.agentRun.id}`,
    },
  });
  const verificationRun = await reactToLatest(log);

  console.log("\n6. Verification (simulated) auto-advances (L3) - produces evidence awaiting the Merge Gate.");
  const verificationResult: VerificationResult = {
    id: "VERIF-0001",
    type: "verification-result",
    state: "recorded",
    version: 1,
    createdAt: now(),
    modifiedAt: now(),
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
  await reactToLatest(log); // pure gate, expect "no agent to dispatch"
  console.log(`  -> pending approval: ${pendingApprovals(repoRoot).map((a) => a.id).join(", ")}`);

  console.log("\n7. Human approves integration (Merge Gate) - the loop's terminal event.");
  await approveArtifact(repoRoot, log, {
    type: "verification-result",
    id: verificationResult.id,
    approver: "human:kris",
    nextEvent: { type: "Integrated", payload: { sliceId: slice.id }, actor: "human:kris" },
  });

  console.log("\nDone.");
  console.log(`  pending approvals: ${pendingApprovals(repoRoot).length}`);
  console.log(`  pending agent runs: ${pendingAgentRuns(repoRoot).length}`);
  console.log(`  event log: ${readEvents(log).map((e) => e.type).join(" -> ")}`);
  console.log(`\nInspect the result:\n  cd demo-run && git log --oneline\n  cat demo-run/product/requirements/REQ-0001.md`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
