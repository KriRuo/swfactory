# Build Plan and Open Decisions

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Recommended Build Sequence

1.  Define JSON/YAML schemas for `Evidence`, `UseCase`, `Requirement`,
    `AcceptanceCriterion`, `Decision`, `Slice`, `AgentRun`, and
    `VerificationResult`.
2.  Create a small seed application/repository and one realistic change
    scenario.
3.  Implement Git-backed product state plus immutable event/audit log.
4.  Implement orchestrator state machine/event handling.
5.  Implement Product/RE agent and human approval gate.
6.  Implement Architecture/Planning agent.
7.  Implement Engineering agent with isolated execution and
    branch/worktree handling.
8.  Implement independent Verification agent and test execution.
9.  Implement failure routing/backward loop.
10. Project relationships into graph/index and add traceability view.
11. Run repeatable benchmark scenarios and measure quality, autonomy,
    and cost.
12. Only then split additional specialist roles and broaden lifecycle
    coverage.

## 2. Current MVP Decisions

  -----------------------------------------------------------------------
  Decision                            Recommendation
  ----------------------------------- -----------------------------------
  Source of truth                     Git-backed structured artifacts

  Graph                               Derived projection; Memgraph is a
                                      viable choice

  Workflow style                      Event-driven state machine with
                                      durable run records

  Agent topology                      Five agents initially; split later

  Human UI                            Minimal approval plus
                                      traceability/run inspection UI

  Execution                           Sandboxed local/container execution
                                      with least privilege

  Model access                        Provider abstraction; credentials
                                      held by factory

  Testing                             Deterministic automated checks plus
                                      independent LLM review where
                                      judgment is required
  -----------------------------------------------------------------------

## 3. Open Questions

Resolved — see `10_MVP_BUILD_DECISIONS.md`:

-   ~~Which orchestrator/framework should be used versus built minimally?~~
    Built minimally: in-process TS state machine + SQLite event log.
-   ~~What artifact serialization and schema language should be canonical?~~
    Markdown + YAML frontmatter, Zod-validated.
-   ~~What is the first benchmark application and change request?~~
    Selection criteria fixed (small, TypeScript, file-based DB,
    permissive license, existing tests); specific repo picked live at
    fork-in time.

Still open:

-   How should confidence be calculated and propagated?
-   When does an artifact change require re-approval?
-   How are conflicting agent recommendations represented and resolved?
-   Which quality metrics determine whether the factory is better than a
    human/AI-assisted baseline?
-   How much context should agents receive directly versus retrieve on
    demand?

## 4. Definition of Ready to Build

We are ready to start implementation when the following are fixed:

1.  first benchmark scenario — **selection criteria fixed, specific repo
    deferred to fork-in time** (`10_MVP_BUILD_DECISIONS.md` §2);
2.  core schemas — **format fixed** (Markdown + YAML frontmatter, Zod);
    field-level schema definitions are step 1 of the build sequence
    above;
3.  state-transition model — **fixed**: SQLite event log + in-process
    state machine;
4.  tool permission model — **fixed**: Agent SDK tool allowlist + git
    worktree isolation, no container in MVP;
5.  selected MVP technology stack — **fixed**: TypeScript/Node.js, npm
    workspaces monorepo, Claude Agent SDK.

See `10_MVP_BUILD_DECISIONS.md` for the full decision record and
rationale, including milestone 1's definition of done. The broader
concept does not need to be fully solved before coding begins.
