# Concept

## Agentic Software Development Factory

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Vision

The factory is a loop-based software delivery system in which
specialized agents perform and coordinate software-team activities
across inception, planning, creation, verification, and validation.

Humans provide intent, domain judgment, governance, and approval where
consequential decisions require it.

## 2. Core Loop

``` text
Intent
  ↓
Inception
  ↓
Planning
  ↓
Creation
  ↓
Verification
  ↓
Validation
  ↓
Evidence
  └────────→ Intent
```

The lifecycle is deliberately non-linear. New evidence, failed tests,
changed requirements, architectural findings, or production observations
may move work backward to the earliest affected state.

## 3. Principles

### Loop-Based, Not Linear

Running software creates evidence that changes the next development
cycle.

### Artifact-Driven

Agents collaborate primarily by reading and changing a shared, versioned
product state.

### Evidence-Backed

Important claims, requirements, and decisions should be connected to
their rationale and source evidence.

### Agent-Native

Agents have explicit responsibilities, tools, triggers, outputs, and
escalation rules.

### Human-Governed

Autonomy is bounded by decision rights, risk, and confidence.

### Traceable

The factory should explain why a production behavior exists and which
intent, requirement, decision, code, and test produced it.

### Incremental

Work is decomposed into small vertical slices that can be implemented,
verified, and learned from.

## 4. Lifecycle Phases

  -----------------------------------------------------------------------
  Phase                   Question                Representative Outputs
  ----------------------- ----------------------- -----------------------
  Inception               What should be built    Evidence, problem,
                          and why?                outcomes, use cases,
                                                  requirements,
                                                  hypotheses

  Planning                How should it be        Solution approach,
                          delivered?              architecture, slices,
                                                  dependencies, plan,
                                                  verification strategy

  Creation                Can the intent be       Code, UX,
                          transformed into        infrastructure,
                          software?               integrations,
                                                  documentation

  Verification            Was it built correctly? Tests, reviews,
                                                  security checks,
                                                  acceptance evidence

  Validation              Did we build the right  Telemetry, user
                          thing?                  feedback, outcome
                                                  measurement, new
                                                  evidence
  -----------------------------------------------------------------------

## 5. Success Definition

The factory succeeds when it reduces the time and coordination cost
required to move from evidence to validated software without losing
decision quality, accountability, or traceability.
