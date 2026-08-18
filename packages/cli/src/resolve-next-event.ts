import type { ArtifactType } from "@sfai/artifacts";
import { readArtifact, stagePolicy, type EventInput, type EventType } from "@sfai/orchestrator";

/**
 * `approveArtifact` (orchestrator.ts) takes an explicit `nextEvent` — fine
 * for tests/demo, which already know the loop shape. The CLI doesn't want
 * the human to have to know that "approving a Requirement fires
 * RequirementApproved" — it derives that from the artifact's own
 * provenance: who produced it (its AgentRun) -> what triggered that run ->
 * what the stage policy says fires next.
 */
export function resolveNextEvent(
  repoRoot: string,
  type: ArtifactType,
  id: string,
  actor: string
): EventInput & { type: EventType } {
  const { data } = readArtifact(repoRoot, type, id);

  const match = data.createdBy.match(/^agent:(.+)$/);
  if (!match) {
    throw new Error(
      `${type}(${id}) has no agent-run provenance (createdBy: "${data.createdBy}") — can't resolve which event approving it should fire.`
    );
  }

  const { data: agentRun } = readArtifact(repoRoot, "agent-run", match[1]);
  const config = stagePolicy[agentRun.trigger as EventType];
  if (!config) {
    throw new Error(
      `No stage policy entry for trigger "${agentRun.trigger}" (from ${agentRun.id}) — can't resolve the next event for approving ${type}(${id}).`
    );
  }

  return {
    type: config.nextEventType,
    payload: { approvedType: type, approvedId: id },
    actor,
  };
}
