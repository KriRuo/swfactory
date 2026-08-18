# Agent Model

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Agent Contract

Every agent is defined by:

-   mission;
-   triggers;
-   readable context;
-   writable artifacts;
-   tools;
-   expected outputs;
-   quality checks;
-   confidence;
-   escalation conditions;
-   prohibited actions.

## 2. Initial Roster

  --------------------------------------------------------------------------------
  Agent                        Primary Responsibility  Main Outputs
  ---------------------------- ----------------------- ---------------------------
  Discovery Agent              Collect and structure   Evidence records,
                               evidence                observations, unknowns

  BA/RE Agent                  Turn evidence into      Use cases, requirements,
                               shared product          assumptions, acceptance
                               understanding           criteria

  Product Agent                Prioritize outcomes and Priorities, product
                               scope                   decisions, release/slice
                                                       intent

  UX Agent                     Model user interaction  Journeys, interaction
                                                       requirements,
                                                       prototypes/specifications

  Architecture Agent           Define and assess       Architecture decisions,
                               technical structure     interfaces, constraints,
                                                       impact analysis

  Planning Agent               Convert intent into     Slices, dependencies,
                               executable vertical     execution plan
                               slices                  

  Engineering Agent            Implement approved      Code, configuration,
                               slices                  migrations, implementation
                                                       notes

  Integration/Infrastructure   Provide runtime and     Environments, pipelines,
  Agent                        integration capability  integrations,
                                                       infrastructure

  Test Agent                   Design and execute      Tests, results, defects,
                               verification            coverage evidence

  Review/Quality Agent         Independent quality     Review findings,
                               challenge               consistency checks, quality
                                                       score

  Security Agent               Assess                  Threat findings,
                               security-relevant       dependency/configuration
                               changes                 checks

  Validation/Analytics Agent   Evaluate outcomes after Telemetry analysis,
                               execution               feedback synthesis, new
                                                       evidence

  Orchestrator                 Select next actions and Runs, queues, gates,
                               coordinate state        escalations
                               transitions             
  --------------------------------------------------------------------------------

## 3. Independence Rule

Where practical, the agent that verifies or reviews a change should not
be the same run that created it.

The factory should preserve a challenger role rather than allowing a
single agent to self-certify.

## 4. MVP Agent Set

The first implementation should collapse roles into five practical
agents:

1.  Orchestrator
2.  Product / RE Agent
3.  Architecture / Planning Agent
4.  Engineering Agent
5.  Verification Agent

Additional specialist agents can be split out once the core loop works.
