# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

**This repo is the implementation, not just specs.** `agentic_software_factory_specs_md/` still holds the design docs (below), but this is now a working npm workspaces monorepo — TypeScript/Node.js, the Claude Agent SDK for agent execution (one scoped session per agent role), a SQLite event log + in-process state machine for orchestration, git worktrees for Engineering-agent sandboxing, Markdown+YAML-frontmatter artifacts validated by Zod, and a CLI-only approval flow. The seed application (`fixtures/seed-app`) was built from scratch rather than forked — a small Express + `node:sqlite` "Notes API" — since no candidate reviewed in `10_MVP_BUILD_DECISIONS.md` met every criterion.

Layout:
```
packages/artifacts/      Zod schemas for the 8 core entities + Markdown+YAML-frontmatter (de)serialization
packages/orchestrator/   Git-backed /product store, SQLite event log, stage-policy state machine,
                          per-role agent dispatchers under src/agents/
packages/cli/            npm run cli -- submit|approve|plan|implement|status
fixtures/seed-app/       The product being evolved by the factory (Express + node:sqlite)
scripts/demo.ts          SDK-free walkthrough of the whole loop with fabricated agent output (npm run demo)
product/                 The factory's own live product state (real artifacts from real agent runs)
.sfai/                   Gitignored: event log (events.sqlite) + per-slice worktrees
```

Commands: `npm run build` (tsc -b, project references), `npm test` (vitest, ~30 tests, all SDK-free), `npm run demo` (simulated end-to-end loop, no API calls), `npm run cli -- <submit|approve|plan|implement|status>` (real Agent SDK calls — real cost/latency, see "Current build status" below).

### Current build status

Built one agent role at a time, each as its own commit, following `09_BUILD_PLAN_AND_OPEN_DECISIONS.md` §1's build sequence. Steps 1–7 are done and pushed to `origin/master`:

| Step | What | Commit |
|---|---|---|
| 1–3 | Schemas, seed app, git-backed product state + event log | `c5d0024` |
| 4 | Orchestrator state machine (stage policy, schedule/complete/approve) | `f5c0d68` |
| 5 | Product/RE agent (real SDK) + CLI (`submit`/`approve`/`status`) | `3c460b0` |
| 6 | Architecture/Planning agent (real SDK) + `plan` command | `d7d5dcb` |
| 7 | Engineering agent (real SDK, git worktree isolation) + `implement` command | `63444f0` |

**A real, live run is in progress in this repo's own `/product` tree** (the factory tracking itself as its first product, per `10_MVP_BUILD_DECISIONS.md` §2): `EVID-0001` → `REQ-0001` (approved) → `SLICE-0001` (add `GET /notes?q=` keyword search) → implemented and committed on branch `slice/SLICE-0001` in worktree `.sfai/worktrees/SLICE-0001`, 14/14 tests passing there. `AGENTRUN-0004` (verification) is pending — `npm run cli -- status` shows it. **Step 8 (Verification agent) is the very next piece of work** — it independently runs that worktree's test suite as a separate SDK session from Engineering (independence rule, `03_AGENT_MODEL.md` §3), produces a `VerificationResult`, and its approval is the Merge Gate that fires the loop's terminal `Integrated` event.

**Pattern for continuing** (steps 5–7 all followed this — read one of those commit messages for the concrete shape): use plan mode before each new agent role (there's real design surface each time — steps 5→6 needed the discover-and-commit vs. write-then-commit split, 6→7 needed the auto-advance gating fix, 7 needed worktree isolation); build the agent dispatcher under `packages/orchestrator/src/agents/`; add the matching CLI command; run `npm run build && npm test`; then a **manual, deliberate real-cost dispatch** against this repo's own live run (not a throwaway fixture) as the actual verification — every phase so far has surfaced at least one real bug that automated tests couldn't catch (a `git status --porcelain` collapsing behavior, an event-ordering bug, a `vitest` root-resolution assumption). Commit and push each phase once it's verified.

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
