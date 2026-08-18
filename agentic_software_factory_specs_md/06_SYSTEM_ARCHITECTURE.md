# System Architecture

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Logical Layers

  -----------------------------------------------------------------------
  Layer                   Components              Responsibility
  ----------------------- ----------------------- -----------------------
  Control Plane           Orchestrator, event     Select and govern
                          bus/queue, policy       actions
                          engine, approval        
                          service                 

  Agent Workforce         Agent runtime,          Perform
                          instructions, tool      cognitive/software work
                          adapters                

  Knowledge Plane         Git artifacts, metadata Maintain shared product
                          store, graph/index,     state and traceability
                          schemas                 

  Execution Plane         Git repository,         Create and verify
                          sandbox, CI/CD, test    software
                          runners                 

  Observation Plane       Logs, metrics, feedback Generate evidence from
                          adapters                running software
  -----------------------------------------------------------------------

## 2. MVP Component Boundary

-   Orchestrator service
-   Agent runtime/provider abstraction
-   Git-backed product repository
-   Structured artifact schemas
-   Graph/index projection for relationships
-   Tool execution sandbox
-   CI/test integration
-   Human approval UI/API
-   Event/audit log
-   Minimal web UI for state, graph, and run inspection

## 3. Technology Direction

Keep orchestration and agent/provider integrations replaceable.

Use open interfaces around:

-   LLM providers;
-   Git;
-   graph storage;
-   execution environments.

A graph such as Memgraph can be used as a derived relationship and
impact view rather than the sole source of truth.

## 4. Non-Functional Requirements

-   Reproducibility of agent runs where possible
-   Complete audit trail
-   Least-privilege tool access
-   Isolation of code execution
-   Provider/model replaceability
-   Recoverable/idempotent workflow steps
-   Human-readable artifacts
-   Low operational complexity for the MVP
