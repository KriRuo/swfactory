import {
  completeAgentRunFromDispatch,
  nextArtifactId,
  openEventLog,
  pendingAgentRuns,
  readArtifact,
  readEvents,
  runArchitecturePlanningAgent,
  scheduleAgentRun,
} from "@sfai/orchestrator";
import { eventLogPath } from "../repo.js";

export async function plan(repoRoot: string, requirementId: string): Promise<void> {
  const log = openEventLog(eventLogPath(repoRoot));

  const { data: requirement } = readArtifact(repoRoot, "requirement", requirementId);

  // MVP runs one loop at a time - no need to cross-reference which
  // requirement scheduled this run, same trust assumption as the sandbox.
  const agentRun = pendingAgentRuns(repoRoot).find((r) => r.agentRole === "architecture-planning");
  if (!agentRun) {
    console.error('No pending architecture-planning run. Did you "approve" a requirement first?');
    process.exitCode = 1;
    return;
  }

  console.log(`Dispatching ${agentRun.id} for ${requirement.id}...`);
  const sliceId = nextArtifactId(repoRoot, "slice", "SLICE");
  const { success, output } = await runArchitecturePlanningAgent(repoRoot, agentRun, requirement, sliceId);

  const result = await completeAgentRunFromDispatch(repoRoot, log, agentRun.id, {
    output,
    // Auto-advance (L3) only when the agent itself reported success -
    // discoverAndCommitProducts separately withholds it on a validation
    // failure regardless of what's passed here.
    autoAdvanceEvent: success
      ? { type: "SliceApproved", payload: { sliceId }, actor: `agent:${agentRun.id}` }
      : undefined,
  });

  if (result.rejected.length > 0) {
    console.error(`Run failed - ${result.rejected.length} file(s) didn't pass validation:`);
    for (const r of result.rejected) console.error(`  ${r.path}: ${r.error}`);
    process.exitCode = 1;
    return;
  }
  if (!success) {
    console.error(`Agent session did not report success - not auto-advancing. Output: ${output}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Committed: ${result.committed.map((a) => `${a.type}(${a.id})`).join(", ")}`);

  const latest = readEvents(log).at(-1)!;
  const scheduled = await scheduleAgentRun(repoRoot, log, latest);
  if (scheduled) {
    console.log(`Scheduled ${scheduled.agentRun.agentRole} run ${scheduled.agentRun.id}: ${scheduled.agentRun.action}`);
    console.log("(No agent implementation exists yet for this role - it stays pending until that build phase.)");
  }
}
