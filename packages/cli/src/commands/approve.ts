import type { ArtifactType } from "@sfai/artifacts";
import { approveArtifact, openEventLog, readEvents, scheduleAgentRun } from "@sfai/orchestrator";
import { resolveNextEvent } from "../resolve-next-event.js";
import { eventLogPath } from "../repo.js";

export async function approve(repoRoot: string, type: ArtifactType, id: string, actor: string): Promise<void> {
  const log = openEventLog(eventLogPath(repoRoot));
  const nextEvent = resolveNextEvent(repoRoot, type, id, actor);

  await approveArtifact(repoRoot, log, { type, id, approver: actor, nextEvent });
  console.log(`Approved ${type}(${id}). Fired ${nextEvent.type}.`);

  const latest = readEvents(log).at(-1)!;
  const scheduled = await scheduleAgentRun(repoRoot, log, latest);
  if (scheduled) {
    console.log(`Scheduled ${scheduled.agentRun.agentRole} run ${scheduled.agentRun.id}: ${scheduled.agentRun.action}`);
    console.log("(No agent implementation exists yet for this role - it stays pending until that build phase.)");
  } else {
    console.log("No further agent to schedule (pure gate or terminal event).");
  }
}
