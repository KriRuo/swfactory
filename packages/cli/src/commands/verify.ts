import { join } from "node:path";
import {
  completeAgentRun,
  nextArtifactId,
  openEventLog,
  pendingAgentRuns,
  readArtifact,
  readEvents,
  runVerificationAgent,
  scheduleAgentRun,
} from "@sfai/orchestrator";
import type { VerificationResult } from "@sfai/artifacts";
import { eventLogPath } from "../repo.js";

export async function verify(repoRoot: string): Promise<void> {
  const log = openEventLog(eventLogPath(repoRoot));

  // MVP runs one loop at a time - same assumption as plan/implement.
  const agentRun = pendingAgentRuns(repoRoot).find((r) => r.agentRole === "verification");
  if (!agentRun) {
    console.error(
      'No pending verification run. Did you "implement" a slice first? Run: npm run cli -- status'
    );
    process.exitCode = 1;
    return;
  }

  // Extract worktree path from the most recent ImplementationCompleted event.
  const events = readEvents(log);
  const implCompletedEvent = events
    .reverse()
    .find((e) => e.type === "ImplementationCompleted");
  if (
    !implCompletedEvent ||
    !implCompletedEvent.payload ||
    typeof implCompletedEvent.payload !== "object"
  ) {
    console.error("Could not find ImplementationCompleted event with payload.");
    process.exitCode = 1;
    return;
  }

  const payload = implCompletedEvent.payload as Record<string, unknown>;
  const worktreePath = payload.worktreePath as string;
  const sliceId = payload.sliceId as string;

  if (!worktreePath || !sliceId) {
    console.error("Could not extract worktreePath or sliceId from ImplementationCompleted event.");
    process.exitCode = 1;
    return;
  }

  // Read the slice to verify against it.
  const { data: slice } = readArtifact(repoRoot, "slice", sliceId);

  // Generate a VerificationResult ID.
  const verificationResultId = nextArtifactId(repoRoot, "verification-result", "VERIF");

  console.log(`Dispatching ${agentRun.id} to verify ${slice.id}...`);
  console.log(`Worktree: ${worktreePath}`);
  console.log(`VerificationResult will be: ${verificationResultId}\n`);

  const { success, output, testOutput } = await runVerificationAgent(
    worktreePath,
    agentRun,
    slice
  );

  if (!success) {
    console.warn(`Agent session did not report success. Output:\n${output}`);
  }

  // Parse test output to determine pass/fail
  const testsPassed = (testOutput.match(/Tests\s+.*?(\d+)\s+passed/i) || [, "0"])[1];
  const testsFailed = (testOutput.match(/Tests\s+.*?(\d+)\s+failed/i) || [, "0"])[1];
  const outcome = parseInt(testsFailed) === 0 ? "pass" : "fail";

  // Create the VerificationResult artifact
  const now = new Date().toISOString();
  const verificationResult: VerificationResult = {
    id: verificationResultId,
    type: "verification-result",
    state: "recorded",
    version: 1,
    createdAt: now,
    modifiedAt: now,
    createdBy: `agent:${agentRun.id}`,
    modifiedBy: `agent:${agentRun.id}`,
    provenance: {
      source: "verification-agent",
      reason: `independently verified ${sliceId} against test suite`,
    },
    relationships: [
      {
        type: "verifies",
        targetId: sliceId,
      },
    ],
    method: "automated-test",
    outcome,
    approvalStatus: outcome === "pass" ? "pending" : undefined,
    evidenceRefs: [],
    details: `Test suite: ${testsPassed} passed, ${testsFailed} failed`,
  };

  const body = `## Verification Results

Tests passed: ${testsPassed}
Tests failed: ${testsFailed}

### Full Test Output

\`\`\`
${testOutput}
\`\`\``;

  console.log("\nCreating VerificationResult artifact...");

  const autoAdvance = outcome === "pass";
  const result = await completeAgentRun(repoRoot, log, agentRun.id, {
    output,
    producedArtifacts: [verificationResult],
    autoAdvanceEvent: autoAdvance
      ? {
          type: "VerificationPassed",
          payload: { verificationResultId, sliceId },
          actor: `agent:${agentRun.id}`,
        }
      : undefined,
  });

  console.log(`Verification ${outcome === "pass" ? "PASSED" : "FAILED"}`);
  console.log(
    `Created: ${result.id} at product/tests/${verificationResultId}.md`
  );

  if (outcome !== "pass") {
    console.error("\nTests failed. Review product/tests/" + verificationResultId + ".md");
    process.exitCode = 1;
    return;
  }

  const latest = readEvents(log).at(-1)!;
  const scheduled = await scheduleAgentRun(repoRoot, log, latest);
  if (scheduled) {
    console.log(`\nScheduled ${scheduled.agentRun.agentRole} run ${scheduled.agentRun.id}: ${scheduled.agentRun.action}`);
  } else {
    console.log("\n✓ Verification passed. Ready for integration approval.");
    console.log(
      `Review verification evidence: product/tests/${verificationResultId}.md`
    );
    console.log(
      `Then approve integration: npm run cli -- approve verification-result ${verificationResultId}`
    );
  }
}

