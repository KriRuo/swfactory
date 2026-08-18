# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repository currently contains **specifications only** — there is no source code, build system, package manifest, or test suite yet. The entire content is the markdown document set in `agentic_software_factory_specs_md/`, which defines the concept, domain model, and architecture for an "Agentic Software Development Factory" that has not been implemented.

**MVP scope and technology stack are decided** — see `10_MVP_BUILD_DECISIONS.md`, which supersedes the still-open items in `09_BUILD_PLAN_AND_OPEN_DECISIONS.md` §3. In short: this repo becomes the implementation (an npm workspaces monorepo), in TypeScript/Node.js, using the Claude Agent SDK for agent execution (one scoped session per agent role), a SQLite event log + in-process state machine for orchestration (no external workflow engine), git worktrees for Engineering-agent sandboxing (no containers in MVP), Markdown+YAML-frontmatter artifacts validated by Zod, and a CLI-only approval flow (web UI deferred). The one thing still open is which specific small TypeScript app to fork in as the seed application — selection criteria are fixed (TS, file-based DB, permissive license, existing tests) but the repo itself is picked live at fork-in time. If asked to start implementation, treat `10_MVP_BUILD_DECISIONS.md` §2 and `09_BUILD_PLAN_AND_OPEN_DECISIONS.md` §1 ("Recommended Build Sequence") as the starting point.

## Document set

Read in this order to understand the system; each builds on the last:

| File | Defines |
|---|---|
| `00_README.md` | Index and north star |
| `01_CONCEPT.md` | Core loop (Intent → Inception → Planning → Creation → Verification → Validation → Evidence → Intent) and guiding principles |
| `02_DOMAIN_MODEL.md` | Canonical entities and the relationship chain: `Goal → Evidence → UseCase → Requirement → AcceptanceCriterion → Decision/Architecture → Implementation → Test → Observation → Goal` |
| `03_AGENT_MODEL.md` | Agent roster and contract (mission, triggers, readable context, writable artifacts, tools, escalation) |
| `04_ARTIFACT_AND_TRACEABILITY_MODEL.md` | Product state layout and required artifact metadata |
| `05_ORCHESTRATION_AND_LOOP_SPEC.md` | Event-driven orchestration, transition contract, gates |
| `06_SYSTEM_ARCHITECTURE.md` | Logical layers (Control Plane, Agent Workforce, Knowledge Plane, Execution Plane, Observation Plane) |
| `07_MVP_SCOPE_AND_USE_CASES.md` | The one end-to-end loop the MVP must prove, UC-01 through UC-08 |
| `08_GOVERNANCE_AND_QUALITY.md` | Autonomy levels (L0–L4) and human decision rights |
| `09_BUILD_PLAN_AND_OPEN_DECISIONS.md` | Build sequence, current MVP decisions, and unresolved questions |
| `10_MVP_BUILD_DECISIONS.md` | Resolved MVP scope: stack, sandbox, agent topology, milestone 1 definition of done |

## Architectural concepts to hold in mind

- **Artifact-driven, not chat-driven.** Agents collaborate by reading/writing a shared, versioned product state (Git-backed files under a `/product` tree per `04_ARTIFACT_AND_TRACEABILITY_MODEL.md` §2), not by passing messages to each other directly.
- **Loop, not pipeline.** The lifecycle is explicitly non-linear — any downstream result (failed test, new evidence) can create a backward edge to the earliest artifact needing correction (`01_CONCEPT.md` §2, `05_ORCHESTRATION_AND_LOOP_SPEC.md` §5). Don't design flows that only move forward.
- **Independence rule.** The agent that verifies/reviews a change must not be the same run that created it (`03_AGENT_MODEL.md` §3) — no self-certification.
- **MVP agent topology is five agents**, not the full roster: Orchestrator, Product/RE, Architecture/Planning, Engineering, Verification (`03_AGENT_MODEL.md` §4). The 13-agent roster in §2 is the target end state, reached by later splitting these five.
- **Every consequential change needs provenance** — actor/agent, timestamp, inputs, reason — and no requirement counts as verified without a verification mechanism (`02_DOMAIN_MODEL.md` §4 invariants).
- **Graph storage is derived, not authoritative.** Git-backed structured artifacts are the source of truth; a graph projection (e.g. Memgraph) exists only for relationship traversal and impact analysis (`04_ARTIFACT_AND_TRACEABILITY_MODEL.md` §5, `09_BUILD_PLAN_AND_OPEN_DECISIONS.md` §2).
- **Autonomy is bounded by governance level**, not uniform: L2 (propose, human approves) for intent/requirements/architecture decisions; L3 (execute within policy, human reviews exceptions) for planning, coding, and automated verification in an isolated environment; human approval is always required before integration/deployment (`08_GOVERNANCE_AND_QUALITY.md` §2).
