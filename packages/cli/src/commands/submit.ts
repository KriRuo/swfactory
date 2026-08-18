import type { Evidence } from "@sfai/artifacts";
import {
  appendEvent,
  completeAgentRunFromDispatch,
  initProductTree,
  nextArtifactId,
  openEventLog,
  runProductReAgent,
  scheduleAgentRun,
  writeArtifact,
} from "@sfai/orchestrator";
import { eventLogPath } from "../repo.js";

export async function submit(repoRoot: string, summary: string, actor: string): Promise<void> {
  initProductTree(repoRoot);
  const log = openEventLog(eventLogPath(repoRoot));

  const evidenceId = nextArtifactId(repoRoot, "evidence", "EVID");
  const now = new Date().toISOString();
  const evidence: Evidence = {
    id: evidenceId,
    type: "evidence",
    state: "new",
    version: 1,
    createdAt: now,
    modifiedAt: now,
    createdBy: actor,
    modifiedBy: actor,
    provenance: { source: "user-submission", reason: "capture initial need" },
    relationships: [],
    kind: "stakeholder-input",
    summary,
  };
  await writeArtifact(repoRoot, evidence, summary);
  console.log(`Created ${evidence.id}.`);

  const eventId = appendEvent(log, { type: "EvidenceAdded", payload: { evidenceId }, actor });
  const scheduled = await scheduleAgentRun(repoRoot, log, { id: eventId, ts: now, type: "EvidenceAdded", payload: { evidenceId }, actor });
  if (!scheduled) {
    console.log("No agent scheduled (unexpected for EvidenceAdded) - nothing to dispatch.");
    return;
  }

  console.log(`Scheduled ${scheduled.agentRun.agentRole} run ${scheduled.agentRun.id}. Dispatching a real agent session...`);

  const useCaseId = nextArtifactId(repoRoot, "use-case", "USECASE");
  const requirementId = nextArtifactId(repoRoot, "requirement", "REQ");

  const { success, output } = await runProductReAgent(repoRoot, scheduled.agentRun, evidence, {
    useCaseId,
    requirementId,
  });

  const result = await completeAgentRunFromDispatch(repoRoot, log, scheduled.agentRun.id, { output });

  if (result.rejected.length > 0) {
    console.error(`Run failed - ${result.rejected.length} file(s) didn't pass validation:`);
    for (const r of result.rejected) console.error(`  ${r.path}: ${r.error}`);
    process.exitCode = 1;
    return;
  }
  // Validation passing doesn't mean the SDK session itself reported success
  // (e.g. it could have hit max turns before finishing) - surface that
  // separately rather than blocking an otherwise-valid commit on it.
  if (!success) {
    console.warn(`Note: the agent session did not report success. Output: ${output}`);
  }

  console.log(`Committed: ${result.committed.map((a) => `${a.type}(${a.id})`).join(", ")}`);
  console.log(`\nReview product/requirements/${requirementId}.md, then run:\n  npm run cli -- approve requirement ${requirementId}`);
}
