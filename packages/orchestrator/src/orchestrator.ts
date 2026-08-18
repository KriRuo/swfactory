import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { AgentRun, Artifact, ArtifactType } from "@sfai/artifacts";
import { parseArtifactFile } from "@sfai/artifacts";
import { listArtifacts, readArtifact, writeArtifact } from "./product-state.js";
import { appendEvent, type EventInput, type StoredEvent } from "./event-log.js";
import { git, gitAddCommit } from "./git.js";
import { stagePolicy, type EventType } from "./policy.js";

/** Shared by scheduleAgentRun (agent-run IDs) and callers assigning IDs for artifacts an agent will write. */
export function nextArtifactId(repoRoot: string, type: ArtifactType, prefix: string): string {
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

  const id = nextArtifactId(repoRoot, "agent-run", "AGENTRUN");
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

interface FinishRunInput {
  output: string;
  validationResult?: string;
  state?: AgentRun["state"];
  /** Pass only when the stage auto-advances (L3); omit for an L2 stage awaiting `approveArtifact`. */
  autoAdvanceEvent?: EventInput & { type: EventType };
}

/** Marks a pending AgentRun succeeded/failed and logs completion (+ optional auto-advance). Shared by both completion paths below. */
async function finishRun(
  repoRoot: string,
  log: DatabaseSync,
  agentRunId: string,
  input: FinishRunInput
): Promise<AgentRun> {
  const { data: agentRun, body } = readArtifact(repoRoot, "agent-run", agentRunId);
  const state = input.state ?? "succeeded";
  const updated: AgentRun = {
    ...agentRun,
    version: agentRun.version + 1,
    modifiedAt: new Date().toISOString(),
    modifiedBy: "orchestrator",
    state,
    output: input.output,
    validationResult: input.validationResult,
    provenance: { ...agentRun.provenance, reason: state === "failed" ? "run failed validation" : "run completed" },
  };
  await writeArtifact(repoRoot, updated, body);

  // AgentRunCompleted (bookkeeping) is logged before the domain-advancing
  // event, so the domain event a dispatcher reacts to is always the latest
  // entry in the log.
  appendEvent(log, { type: "AgentRunCompleted", payload: { agentRunId, state }, actor: "orchestrator" });
  if (input.autoAdvanceEvent) {
    appendEvent(log, input.autoAdvanceEvent);
  }

  return updated;
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
  for (const artifact of input.producedArtifacts ?? []) {
    await writeArtifact(repoRoot, artifact, `Produced by ${agentRunId}.`);
  }
  return finishRun(repoRoot, log, agentRunId, input);
}

export interface DiscoverAndCommitResult {
  committed: Artifact[];
  rejected: { path: string; error: string }[];
}

/**
 * For a real agent session that wrote files itself (via its own Write
 * tool) rather than returning data for us to write: finds what changed
 * under /product (`git status --porcelain`), Zod-validates each file, and
 * commits only the ones that validate. Invalid files are left uncommitted
 * and reported, not auto-fixed or retried.
 */
export async function discoverAndCommitProducts(repoRoot: string): Promise<DiscoverAndCommitResult> {
  // --untracked-files=all: plain --porcelain collapses a wholly-new directory
  // into a single "?? product/" line instead of listing the files inside it.
  // Safe to force here (unlike a blanket -uall) since it's scoped to the
  // small, known /product pathspec, not the whole working tree.
  const statusOutput = await git(repoRoot, ["status", "--porcelain", "--untracked-files=all", "--", "product"]);
  const relativePaths = statusOutput
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((path) => path.endsWith(".md"));

  const committed: Artifact[] = [];
  const rejected: { path: string; error: string }[] = [];

  for (const relativePath of relativePaths) {
    const absolutePath = join(repoRoot, relativePath);
    try {
      const raw = readFileSync(absolutePath, "utf-8");
      const { data } = parseArtifactFile(raw);
      const message = `${data.type}(${data.id}): ${data.provenance.reason}`;
      await gitAddCommit(repoRoot, absolutePath, message);
      committed.push(data);
    } catch (err) {
      rejected.push({ path: relativePath, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { committed, rejected };
}

export interface CompleteAgentRunFromDispatchInput {
  output: string;
  validationResult?: string;
  autoAdvanceEvent?: EventInput & { type: EventType };
}

export interface CompleteAgentRunFromDispatchResult extends DiscoverAndCommitResult {
  agentRun: AgentRun;
}

/**
 * The real-dispatch counterpart to completeAgentRun: instead of writing
 * caller-supplied artifacts, discovers+validates+commits whatever the
 * agent's own Write tool produced. A rejected file marks the run "failed"
 * and withholds `autoAdvanceEvent` — the loop should not proceed on
 * unvalidated output.
 */
export async function completeAgentRunFromDispatch(
  repoRoot: string,
  log: DatabaseSync,
  agentRunId: string,
  input: CompleteAgentRunFromDispatchInput
): Promise<CompleteAgentRunFromDispatchResult> {
  const { committed, rejected } = await discoverAndCommitProducts(repoRoot);
  const succeeded = rejected.length === 0;
  const agentRun = await finishRun(repoRoot, log, agentRunId, {
    output: input.output,
    validationResult: input.validationResult,
    state: succeeded ? "succeeded" : "failed",
    autoAdvanceEvent: succeeded ? input.autoAdvanceEvent : undefined,
  });
  return { agentRun, committed, rejected };
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
