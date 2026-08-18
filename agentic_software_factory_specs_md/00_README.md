# Agentic Software Development Factory

## Repository Context and Specification Index

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## Purpose

This document set defines the current concept and the minimum
specification needed to build and test an MVP of a loop-based, agentic
software development factory.

## North Star

Enable one person, or a small team, to continuously turn evidence into
shared understanding, shared understanding into running software, and
running software back into evidence, while preserving quality,
traceability, and explicit human governance.

## Document Set

  -----------------------------------------------------------------------------
  File                                      Purpose
  ----------------------------------------- -----------------------------------
  `01_CONCEPT.md`                           Product concept, principles, and
                                            lifecycle.

  `02_DOMAIN_MODEL.md`                      Canonical entities and
                                            relationships in the factory.

  `03_AGENT_MODEL.md`                       Agent roles, responsibilities,
                                            inputs, outputs, and boundaries.

  `04_ARTIFACT_AND_TRACEABILITY_MODEL.md`   Shared product state, artifact
                                            lifecycle, and traceability.

  `05_ORCHESTRATION_AND_LOOP_SPEC.md`       Triggers, workflow semantics,
                                            gates, and feedback loops.

  `06_SYSTEM_ARCHITECTURE.md`               Logical architecture and component
                                            responsibilities.

  `07_MVP_SCOPE_AND_USE_CASES.md`           Smallest buildable MVP, system use
                                            cases, and acceptance criteria.

  `08_GOVERNANCE_AND_QUALITY.md`            Human decision rights, autonomy,
                                            quality, and safety controls.

  `09_BUILD_PLAN_AND_OPEN_DECISIONS.md`     Implementation sequence, test
                                            strategy, and unresolved decisions.

  `10_MVP_BUILD_DECISIONS.md`               Resolved MVP scope decisions:
                                            stack, sandbox, agent
                                            topology, milestone 1
                                            definition of done.
  -----------------------------------------------------------------------------

## What Is Still Needed Before Building

Resolved — see `10_MVP_BUILD_DECISIONS.md`:

-   Orchestration runtime and agent framework: TypeScript/Node.js,
    Claude Agent SDK, in-process state machine + SQLite event log.
-   Executable schemas for the core domain objects: Markdown + YAML
    frontmatter, Zod-validated.
-   Tool permissions and sandboxing for coding agents: git
    worktree per slice, Agent SDK tool allowlist, no container in MVP.

Still open:

-   Choose the persistence implementation for the graph/relationship
    projection (deferred past MVP — see `10_MVP_BUILD_DECISIONS.md` §2).
-   Define the first end-to-end demonstration scenario and seed
    repository (selection criteria fixed; specific repo picked live at
    fork-in time — see `10_MVP_BUILD_DECISIONS.md` §2).
-   Define evaluation metrics and a repeatable benchmark for the
    factory.
-   Decide which gates are mandatory in the MVP versus advisory.
