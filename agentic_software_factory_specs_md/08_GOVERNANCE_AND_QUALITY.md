# Governance and Quality

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Autonomy Levels

  -----------------------------------------------------------------------
  Level                               Behavior
  ----------------------------------- -----------------------------------
  L0                                  Human performs; AI may observe

  L1                                  AI assists human

  L2                                  AI proposes; human approves before
                                      execution

  L3                                  AI executes within policy; human
                                      reviews exceptions/results

  L4                                  AI executes autonomously within an
                                      explicitly bounded low-risk domain
  -----------------------------------------------------------------------

## 2. Default MVP Policy

Use:

-   **L2** for changes to product intent, requirements, and
    consequential architecture decisions.
-   **L3** for bounded planning, coding, and automated verification in
    an isolated environment.
-   **Human approval** before integration/deployment.

## 3. Quality Controls

-   Schema validation of artifacts
-   Independent verification/challenger run
-   Automated tests and static checks
-   Traceability completeness checks
-   Confidence and uncertainty disclosure
-   No silent mutation of approved artifacts
-   Tool allowlists and scoped credentials
-   Audit log for all state-changing actions
-   Budget/time/token limits per run
-   Escalation after repeated failure or ambiguity

## 4. Decision Rights

Humans retain authority over:

-   business intent;
-   acceptance of material risk;
-   major scope changes;
-   irreversible operations;
-   credentials and secrets;
-   production release policy;
-   decisions explicitly marked as governed.
