# Orchestration and Loop Specification

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Event-Driven Model

The orchestrator observes events and state changes, determines affected
artifacts, evaluates policy, schedules agent work, and records the
resulting transition.

## 2. Event Examples

  -----------------------------------------------------------------------
  Event                               Likely Reaction
  ----------------------------------- -----------------------------------
  `EvidenceAdded`                     Analyze evidence; identify affected
                                      goals/use cases/requirements

  `RequirementChanged`                Run impact analysis; update plan;
                                      regenerate affected verification

  `DecisionChanged`                   Identify architecture,
                                      implementation, and test impact

  `SliceApproved`                     Schedule implementation

  `ImplementationCompleted`           Schedule independent review and
                                      tests

  `TestFailed`                        Diagnose; route to requirement,
                                      plan, or implementation depending
                                      on root cause

  `DeploymentObserved`                Collect telemetry and validation
                                      evidence

  `OutcomeMissed`                     Create new inception/analysis work
  -----------------------------------------------------------------------

## 3. Transition Contract

Each transition records:

-   trigger;
-   preconditions;
-   selected agent;
-   input snapshot;
-   requested action;
-   tool permissions;
-   output;
-   validation result;
-   confidence;
-   state delta;
-   next events.

## 4. Gates

### Intent Gate

Human confirms meaningful objective and scope.

### Plan Gate

Solution/slice is sufficiently specified to execute.

### Merge / Deploy Gate

Verification evidence satisfies policy.

### Risk Gate

Security, regulatory, or high-impact changes require explicit approval.

### Outcome Gate

Validation determines whether to continue, revise, or stop.

## 5. Loop Behavior

The orchestrator must not force work forward.

Any downstream result can create a backward edge to the earliest
artifact that needs correction. This is a core property of the factory.
