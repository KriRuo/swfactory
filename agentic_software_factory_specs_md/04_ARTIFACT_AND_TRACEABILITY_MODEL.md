# Artifact and Traceability Model

**Status:** Working specification\
**Version:** 0.1\
**Date:** 18 August 2026

## 1. Product State

The factory requires a canonical product state that is readable by
humans and agents.

Git-backed files can be the system of record for the MVP, with a
graph/index derived from them for relationship traversal.

## 2. Suggested Structure

``` text
/product
  /intent
  /evidence
  /stakeholders
  /use-cases
  /requirements
  /ux
  /architecture
  /decisions
  /plans
  /implementation
  /tests
  /quality
  /operations
  /telemetry
```

## 3. Minimum Artifact Metadata

-   Stable ID and type
-   Lifecycle state
-   Version
-   Created/modified timestamp
-   Created/modified by human or agent run
-   Source/provenance
-   Relationships to other artifacts
-   Confidence where inference is involved
-   Approval status where required
-   Validation/verification status

## 4. Traceability Queries

The factory must be able to answer:

-   Why does this requirement exist?
-   Which code implements this requirement?
-   Which tests verify it?
-   What breaks if this use case changes?
-   Which decisions depend on this evidence?
-   Which production observations validate or contradict the original
    goal?
-   What changed, who or what changed it, and why?

## 5. Storage Principle

Keep source artifacts lightweight and portable.

Relationships may be projected into a graph database for reasoning and
visualization, but the MVP should avoid making the graph database the
only authoritative copy of product intent.
