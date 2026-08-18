/**
 * Milestone-1 happy-path event vocabulary. `EvidenceAdded`, `SliceApproved`,
 * and `ImplementationCompleted` are literal matches from
 * 05_ORCHESTRATION_AND_LOOP_SPEC.md §2. `RequirementApproved` and
 * `VerificationPassed` are MVP-specific — the spec's event table is
 * illustrative, not exhaustive, and names no event for "the L2 approval
 * landed" or "verification succeeded". `Integrated` is the loop's terminal
 * event for milestone 1. Failure routing (`TestFailed`, UC-06) and
 * post-deploy validation (`DeploymentObserved`, `OutcomeMissed`) are both
 * explicitly out of scope for milestone 1 and are not modeled here.
 */
export type EventType =
  | "EvidenceAdded"
  | "RequirementApproved"
  | "SliceApproved"
  | "ImplementationCompleted"
  | "VerificationPassed"
  | "Integrated"
  | "AgentRunScheduled"
  | "AgentRunCompleted";

export type AgentRole =
  | "product-re"
  | "architecture-planning"
  | "engineering"
  | "verification";

export interface StageConfig {
  /** Agent role to dispatch. Absent for a pure human-approval gate with no agent work (e.g. the Merge Gate). */
  agentRole?: AgentRole;
  action: string;
  toolPermissions: string[];
  /** L2 (08_GOVERNANCE_AND_QUALITY.md §2) if true; L3 auto-advance if false. */
  requiresHumanApproval: boolean;
  nextEventType: EventType;
}

/** One entry per triggering event — see the design table in the phase-2 plan. */
export const stagePolicy: Partial<Record<EventType, StageConfig>> = {
  EvidenceAdded: {
    agentRole: "product-re",
    action: "Propose a use case and requirement from this evidence",
    toolPermissions: ["Read", "Write"],
    requiresHumanApproval: true,
    nextEventType: "RequirementApproved",
  },
  RequirementApproved: {
    agentRole: "architecture-planning",
    action: "Plan an implementation slice for this requirement",
    toolPermissions: ["Read", "Write"],
    requiresHumanApproval: false,
    nextEventType: "SliceApproved",
  },
  SliceApproved: {
    agentRole: "engineering",
    action: "Implement the approved slice in an isolated worktree",
    toolPermissions: ["Read", "Write", "Edit", "Bash"],
    requiresHumanApproval: false,
    nextEventType: "ImplementationCompleted",
  },
  ImplementationCompleted: {
    agentRole: "verification",
    action: "Independently verify the implementation against acceptance criteria",
    toolPermissions: ["Read", "Bash"],
    requiresHumanApproval: false,
    nextEventType: "VerificationPassed",
  },
  VerificationPassed: {
    // No agent to dispatch — this is the Merge Gate: verification evidence
    // satisfies policy, but integration always needs a human before proceeding.
    action: "Approve integration of the verified change",
    toolPermissions: [],
    requiresHumanApproval: true,
    nextEventType: "Integrated",
  },
};
