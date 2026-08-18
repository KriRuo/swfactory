# Domain Model

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Modeling Rule

Roles are not the primary model.

The primary unit is a stateful product object acted on by agents under
policy:

``` text
State → Artifact → Agent Action → Evidence → Decision → New State
```

## 2. Core Entities

  -----------------------------------------------------------------------------------
  Entity                  Meaning                             Key Relationships
  ----------------------- ----------------------------------- -----------------------
  Product                 Software/product being evolved      Has goals, artifacts,
                                                              versions, environments

  Goal                    Desired business/user outcome       Supported by evidence;
                                                              realized by
                                                              capabilities

  Evidence                Observation or source               Supports claims, needs,
                          supporting/refuting understanding   decisions, validation

  Claim                   Structured interpretation of        May be corroborated,
                          evidence                            contradicted, or
                                                              unresolved

  Stakeholder / Actor     Human or system with needs or       Participates in use
                          interactions                        cases; provides
                                                              evidence

  Use Case                Goal-oriented interaction with the  Realizes goals;
                          system                              contains scenarios;
                                                              drives requirements

  Requirement             Constraint or behavior the solution Derived from needs/use
                          must satisfy                        cases; verified by
                                                              acceptance criteria

  Acceptance Criterion    Testable condition of satisfaction  Verifies requirements;
                                                              maps to tests

  Decision                Explicit choice with rationale      Affected by evidence;
                                                              may create
                                                              architecture/product
                                                              constraints

  Architecture Element    Structural solution component or    Realizes requirements;
                          interface                           implemented by code

  Work Slice              Small vertical delivery unit        Groups affected
                                                              artifacts and
                                                              implementation work

  Implementation          Code/configuration/infrastructure   Implements requirements
                                                              and architecture

  Test                    Executable verification             Verifies criteria and
                                                              implementation

  Observation             Runtime/user measurement            Validates outcomes and
                                                              becomes evidence

  Agent                   Autonomous/semi-autonomous worker   Performs actions using
                                                              tools under policies

  Action / Run            One agent execution with inputs and Changes state and emits
                          outputs                             events/evidence

  Policy / Gate           Rule constraining actions or        May require human
                          transitions                         approval

  Version / Change        Immutable record of state evolution Connects before/after
                                                              states and provenance
  -----------------------------------------------------------------------------------

## 3. Core Relationship Chain

``` text
Goal
 → Evidence / Need
 → Use Case
 → Requirement
 → Acceptance Criterion
 → Decision / Architecture
 → Implementation
 → Test
 → Observation
 → Goal
```

## 4. Invariants

-   Every consequential change has provenance: actor/agent, timestamp,
    inputs, and reason.
-   No requirement is considered verified without at least one
    verification mechanism.
-   No autonomous action may exceed the agent's declared tool and policy
    boundary.
-   A failed downstream check must be traceable to the affected upstream
    objects.
-   Artifacts are versioned; agents do not silently overwrite history.
-   Human decisions are first-class records, not hidden in chat history.
