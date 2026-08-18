# MVP Build Decisions

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Purpose

`09_BUILD_PLAN_AND_OPEN_DECISIONS.md` §4 lists what must be fixed before implementation starts: first benchmark scenario, core schemas, state-transition model, tool permission model, and MVP technology stack. This document records the answers, reached by direct review, so implementation can begin without re-litigating scope. It supersedes the corresponding entries in `09_BUILD_PLAN_AND_OPEN_DECISIONS.md` §2–§3 where they conflict.

## 2. Decisions

| Area | Decision | Rationale |
|---|---|---|
| Repo scope | This repository (`SoftwarefactoryAI`) becomes the implementation, not a spec-only repo. Existing spec files stay as-is; code is added alongside. | Matches the build plan's own sequencing (schemas → seed app → orchestrator, all as one effort). |
| Language/runtime | TypeScript / Node.js for the orchestrator and agent runtime. | Best overlap with the Claude Agent SDK and MCP tooling; lets a later minimal web UI ship from the same codebase without a language switch. |
| Agent execution | Claude Agent SDK — one scoped SDK session per agent role per run, with role-specific system prompt, tool allowlist, and readable/writable artifact paths. | Gives the tool-permission boundaries and least-privilege requirement (`08_GOVERNANCE_AND_QUALITY.md` §3) largely for free, instead of rebuilding a tool-use loop. |
| Agent topology | All 5 MVP agents from `03_AGENT_MODEL.md` §4 (Orchestrator, Product/RE, Architecture/Planning, Engineering, Verification) are built from day one — not collapsed further. | Proves the real loop shape and the independence rule (verifier ≠ implementer) from the start; retrofitting a skipped role later is costlier. |
| Artifact format | Markdown files with YAML frontmatter for structured metadata (id, type, state, relationships, provenance); Markdown body for narrative content. Frontmatter validated by Zod schemas, which also generate the TS types. | Satisfies the "human-readable artifacts" NFR (`06_SYSTEM_ARCHITECTURE.md` §4) while keeping metadata machine-parseable. |
| Orchestration engine | In-process TypeScript state machine backed by an append-only SQLite event log. On startup, state is rebuilt by replaying the log. No external workflow engine (Temporal) or queue (BullMQ/Redis) for MVP. | Matches the "low operational complexity for the MVP" NFR; a durable workflow engine is justified only once the factory needs to scale past one demo loop. |
| Execution sandbox | Each work slice gets its own git worktree/branch; the Engineering agent's Claude Agent SDK session is tool-restricted to that worktree plus the test runner. No container isolation in MVP. | Sufficient isolation when the operator controls the seed app; containerization is deferred until the factory runs against untrusted/third-party codebases. |
| Human approval UI | CLI-based approval/diff review for the Intent, Plan, and Merge gates. The "minimal web UI for state, graph, and run inspection" from `06_SYSTEM_ARCHITECTURE.md` §2 is deferred until after the core loop works end-to-end. | Avoids building UI against a data model that's still shifting during the first implementation pass. |
| Graph/index projection | Deferred. Traceability queries (`04_ARTIFACT_AND_TRACEABILITY_MODEL.md` §4) are answered by parsing frontmatter `relationships` fields into an in-memory graph on demand. Memgraph (or similar) is revisited only if query patterns outgrow this. | At single-scenario MVP scale, a full graph database is premature infrastructure. |
| Failure loop (UC-06) | Milestone 1 is happy-path only (UC-01–UC-05, UC-07, UC-08). Backward routing on failure (UC-06) is an explicit fast-follow, not part of milestone 1. | Failure-cause diagnosis (requirement vs. plan vs. implementation) is the hardest part of the spec and shouldn't block proving the rest of the loop. |
| Repo structure | npm workspaces monorepo: `/packages/orchestrator`, `/packages/artifacts` (schemas + validation), `/packages/cli`, `/fixtures/seed-app`. | Keeps the seed app's dependencies isolated from the factory's own, without adopting Nx/Turborepo overhead the MVP doesn't need yet. |
| Seed application | Criteria fixed: small, TypeScript, file-based database (SQLite or equivalent — no external DB service), permissive license, existing test suite. **Specific repo not yet chosen** — candidates reviewed (kenyipp/realworld-nodejs-example-app, skopekreep/typescript-node-express-realworld-example-app, mjftw/typescript-realworld-backend, TonyMckes/conduit-realworld-example-app) each failed at least one criterion (MySQL/MongoDB/Postgres dependency, or non-permissive license, or non-TypeScript backend). Pick live at fork-in time, re-checking availability then. | Every currently known well-tested RealWorld/Conduit-style TS app carries an external DB dependency, which conflicts with the no-container sandbox decision above; resolving this by picking blind risked locking in a bad fit. |
| Milestone 1 definition of done | A single human-submitted need flows: Product/RE proposes use case + requirement (human approves via CLI) → Architecture/Planning proposes a slice plan → Engineering implements it in a worktree → Verification independently runs tests and reports evidence → human approves integration via CLI → a traceability query walks intent → code → test → result. Explicitly excludes UC-06 (failure routing) and process-interruption/resume. | Concrete, testable finish line matching every scoping decision above; interruption/resume (an explicit MVP success metric in `07_MVP_SCOPE_AND_USE_CASES.md` §5) is deferred to a later milestone rather than folded into the first one. |

## 3. Still open (not blocking milestone 1)

Carried over from `09_BUILD_PLAN_AND_OPEN_DECISIONS.md` §3, unresolved:

- How should confidence be calculated and propagated?
- When does an artifact change require re-approval?
- How are conflicting agent recommendations represented and resolved?
- Which quality metrics determine whether the factory is better than a human/AI-assisted baseline?
- How much context should agents receive directly versus retrieve on demand?

These do not block starting implementation of milestone 1 and can be resolved as they're encountered.
