import type { DatabaseSync } from "node:sqlite";
import type { AgentRun, Artifact, ArtifactType } from "@sfai/artifacts";
import { listArtifacts, readArtifact, writeArtifact } from "./product-state.js";
import { appendEvent, type EventInput, type StoredEvent } from "./event-log.js";
import { stagePolicy, type EventType } from "./policy.js";

function nextId(repoRoot: string, type: ArtifactType, prefix: string): string {
  const existing = listArtifacts(repoRoot, type);
  return `${prefix}-${String(existing.length + 1).padStart(4, "0")}`;
}

export interface ScheduledRun {
  agentRun: AgentRun;
  filePath: string;
}

/**
 * Reacts to an already-recorded event: if the stage policy names an agent
 * role, writes a *pending* AgentRun artifact describing the work and
 * appends an `AgentRunScheduled` audit event. A no-op for events with no
 * policy entry or a pure human-approval gate (no `agentRole`).
 */
export async function scheduleAgentRun(
  repoRoot: string,
  log: DatabaseSync,
  event: StoredEvent
): Promise<ScheduledRun | null> {
  const config = stagePolicy[event.type as EventType];
  if (!config?.agentRole) return null;

  const id = nextId(repoRoot, "agent-run", "AGENTRUN");
  const now = new Date().toISOString();
  const agentRun: AgentRun = {
    id,
    type: "agent-run",
    state: "pending",
    version: 1,
    createdAt: now,
    modifiedAt: now,
    createdBy: "orchestrator",
    modifiedBy: "orchestrator",
    provenance: { source: "orchestrator", reason: `reacting to ${event.type}` },
    relationships: [],
    agentRole: config.agentRole,
    trigger: event.type,
    inputSnapshotRef: `event:${event.id}`,
    action: config.action,
    toolPermissions: config.toolPermissions,
    nextEvents: [config.nextEventType],
  };

  const { filePath } = await writeArtifact(
    repoRoot,
    agentRun,
    `Scheduled for **${config.agentRole}** in reaction to \`${event.type}\` (event #${event.id}).`
  );
  appendEvent(log, {
    type: "AgentRunScheduled",
    payload: { agentRunId: id, agentRole: config.agentRole },
    actor: "orchestrator",
  });

  return { agentRun, filePath };
}

export interface CompleteAgentRunInput {
  output: string;
  validationResult?: string;
  producedArtifacts?: Artifact[];
  /** Pass only when the stage auto-advances (L3); omit for an L2 stage awaiting `approveArtifact`. */
  autoAdvanceEvent?: EventInput & { type: EventType };
}

/** Marks a pending AgentRun succeeded, writes whatever it produced, and optionally auto-advances the loop. */
export async function completeAgentRun(
  repoRoot: string,
  log: DatabaseSync,
  agentRunId: string,
  input: CompleteAgentRunInput
): Promise<AgentRun> {
  const { data: agentRun, body } = readArtifact(repoRoot, "agent-run", agentRunId);
  const updated: AgentRun = {
    ...agentRun,
    version: agentRun.version + 1,
    modifiedAt: new Date().toISOString(),
    modifiedBy: "orchestrator",
    state: "succeeded",
    output: input.output,
    validationResult: input.validationResult,
    provenance: { ...agentRun.provenance, reason: "run completed" },
  };
  await writeArtifact(repoRoot, updated, body);

  for (const artifact of input.producedArtifacts ?? []) {
    await writeArtifact(repoRoot, artifact, `Produced by ${agentRunId}.`);
  }

  // AgentRunCompleted (bookkeeping) is logged before the domain-advancing
  // event, so the domain event a dispatcher reacts to is always the latest
  // entry in the log.
  appendEvent(log, { type: "AgentRunCompleted", payload: { agentRunId }, actor: "orchestrator" });
  if (input.autoAdvanceEvent) {
    appendEvent(log, input.autoAdvanceEvent);
  }

  return updated;
}

export interface ApproveArtifactInput {
  type: ArtifactType;
  id: string;
  approver: string;
  nextEvent: EventInput & { type: EventType };
}

/** Flips `approvalStatus` from "pending" to "approved" (a new version, a new commit) and fires the withheld next event. */
export async function approveArtifact(
  repoRoot: string,
  log: DatabaseSync,
  input: ApproveArtifactInput
): Promise<Artifact> {
  const { data, body } = readArtifact(repoRoot, input.type, input.id);
  if (data.approvalStatus !== "pending") {
    throw new Error(
      `${input.type}(${input.id}) is not pending approval (status: ${data.approvalStatus ?? "none"})`
    );
  }

  const updated: Artifact = {
    ...data,
    version: data.version + 1,
    modifiedAt: new Date().toISOString(),
    modifiedBy: input.approver,
    approvalStatus: "approved",
    provenance: { ...data.provenance, reason: `approved by ${input.approver}` },
  };
  await writeArtifact(repoRoot, updated, body);
  appendEvent(log, input.nextEvent);

  return updated;
}

export function pendingAgentRuns(repoRoot: string): AgentRun[] {
  return listArtifacts(repoRoot, "agent-run")
    .map((parsed) => parsed.data as AgentRun)
    .filter((run) => run.state === "pending");
}

export function pendingApprovals(repoRoot: string): Artifact[] {
  return listArtifacts(repoRoot)
    .map((parsed) => parsed.data)
    .filter((artifact) => artifact.approvalStatus === "pending");
}
