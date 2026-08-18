import { join } from "node:path";
import {
  completeAgentRun,
  createWorktree,
  git,
  openEventLog,
  pendingAgentRuns,
  readArtifact,
  readEvents,
  runEngineeringAgent,
  runInstall,
  scheduleAgentRun,
} from "@sfai/orchestrator";
import { eventLogPath } from "../repo.js";

export async function implement(repoRoot: string, sliceId: string): Promise<void> {
  const log = openEventLog(eventLogPath(repoRoot));

  const { data: slice } = readArtifact(repoRoot, "slice", sliceId);

  // MVP runs one loop at a time - same trust assumption as plan.ts.
  const agentRun = pendingAgentRuns(repoRoot).find((r) => r.agentRole === "engineering");
  if (!agentRun) {
    console.error('No pending engineering run. Did you "plan" a requirement first?');
    process.exitCode = 1;
    return;
  }

  const worktreePath = join(repoRoot, ".sfai", "worktrees", sliceId);
  const branchName = `slice/${sliceId}`;

  console.log(`Creating worktree at ${worktreePath} on branch ${branchName}...`);
  await createWorktree(repoRoot, worktreePath, branchName);

  console.log("Installing dependencies in the worktree (this can take a minute)...");
  await runInstall(worktreePath);

  console.log(`Dispatching ${agentRun.id} for ${slice.id}...`);
  const { success, output, committed } = await runEngineeringAgent(worktreePath, agentRun, slice);

  if (!committed) {
    console.error("Run failed - no commits were made in the worktree. Output:");
    console.error(output);
    process.exitCode = 1;
    return;
  }
  if (!success) {
    console.warn(`Note: the agent session did not report success, but it did commit changes. Output: ${output}`);
  }

  await completeAgentRun(repoRoot, log, agentRun.id, {
    output,
    autoAdvanceEvent:
      success && committed
        ? { type: "ImplementationCompleted", payload: { sliceId, worktreePath, branchName }, actor: `agent:${agentRun.id}` }
        : undefined,
  });

  if (!success) {
    process.exitCode = 1;
    return;
  }

  const worktreeLog = await git(worktreePath, ["log", "--oneline", "-5"]);
  console.log(`\nCommits in ${branchName}:\n${worktreeLog}`);

  const latest = readEvents(log).at(-1)!;
  const scheduled = await scheduleAgentRun(repoRoot, log, latest);
  if (scheduled) {
    console.log(`\nScheduled ${scheduled.agentRun.agentRole} run ${scheduled.agentRun.id}: ${scheduled.agentRun.action}`);
    console.log("(No agent implementation exists yet for this role - it stays pending until that build phase.)");
  }
  console.log(`\nInspect the change: git -C ${worktreePath} diff HEAD~1`);
}
