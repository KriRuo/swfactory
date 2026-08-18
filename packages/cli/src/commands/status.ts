import { pendingAgentRuns, pendingApprovals } from "@sfai/orchestrator";

export function status(repoRoot: string): void {
  const approvals = pendingApprovals(repoRoot);
  const runs = pendingAgentRuns(repoRoot);

  console.log(`Pending approvals (${approvals.length}):`);
  for (const a of approvals) console.log(`  ${a.type}(${a.id})`);

  console.log(`\nPending agent runs (${runs.length}):`);
  for (const r of runs) console.log(`  ${r.agentRole} ${r.id}: ${r.action}`);
}
