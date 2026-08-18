# MVP Scope and Use Cases

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. MVP Goal

Prove one complete loop deeply rather than automating the entire SDLC
broadly.

The MVP should take a small software change from evidence/intent to
specification, plan, implementation, independent verification, and
resulting evidence, with traceability across every step.

## 2. Primary Demonstration

Given a small existing application and a new user need, the factory:

1.  proposes a use case and requirement;
2.  obtains human approval;
3.  creates an implementation plan;
4.  modifies the application;
5.  tests the change;
6.  presents verification evidence;
7.  records the resulting product-state changes.

## 3. MVP Use Cases

  -----------------------------------------------------------------------
  ID                      Use Case                Acceptance
  ----------------------- ----------------------- -----------------------
  UC-01                   Submit intent/evidence  System creates
                                                  structured evidence and
                                                  proposed impacted
                                                  product objects

  UC-02                   Generate/refine         Agent creates traceable
                          specification           use case, requirement,
                                                  and acceptance
                                                  criteria; human can
                                                  approve/reject

  UC-03                   Plan vertical slice     System creates
                                                  implementation
                                                  approach, affected
                                                  components,
                                                  dependencies, and test
                                                  intent

  UC-04                   Implement slice         Engineering agent
                                                  changes code in an
                                                  isolated
                                                  branch/worktree and
                                                  records provenance

  UC-05                   Verify change           Independent agent/tests
                                                  assess acceptance
                                                  criteria and produce
                                                  evidence

  UC-06                   Handle failure loop     Failed check is routed
                                                  back to affected
                                                  spec/plan/code rather
                                                  than blindly retried

  UC-07                   Approve and integrate   Human sees change,
                                                  rationale,
                                                  traceability, and
                                                  verification before
                                                  integration

  UC-08                   Inspect traceability    User can traverse
                                                  intent → requirement →
                                                  change → test → result
  -----------------------------------------------------------------------

## 4. Explicitly Out of Scope

-   Full autonomous production deployment
-   Large multi-team portfolio planning
-   Comprehensive UX generation
-   Full security/compliance automation
-   Multiple simultaneous products
-   Autonomous stakeholder interviewing
-   Sophisticated production analytics

## 5. MVP Success Metrics

-   One end-to-end loop completes without manual artifact copying.
-   Every generated change has traceable rationale and provenance.
-   A deliberately failing test causes a correct backward loop.
-   A human can understand and approve consequential transitions.
-   The factory can resume after interruption without losing state.
-   The core workflow is independent of a specific model/provider.
