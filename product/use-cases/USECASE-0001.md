---
id: USECASE-0001
type: use-case
state: proposed
version: 1
createdAt: '2026-08-18T12:54:00.000Z'
modifiedAt: '2026-08-18T12:54:00.000Z'
createdBy: 'agent:AGENTRUN-0001'
modifiedBy: 'agent:AGENTRUN-0001'
provenance:
  source: product-re-agent
  reason: derived from evidence
relationships:
  - type: derivedFrom
    targetId: EVID-0001
title: Find a Note in a Growing List
actors:
  - End User
goal: >-
  As a user with more notes than fit on one screen, I want to locate a
  specific existing note quickly, so that I don't have to scroll through
  an unbounded list to find something I've already written down.
---

## Reasoning

The evidence (EVID-0001, stakeholder-input) states plainly: "Users can't
find old notes once the list grows past a screenful." This is a direct
usability complaint, not a vague sentiment — it identifies a trigger
condition (list exceeds one screenful) and a concrete failure (notes
become unfindable).

I read this as evidence of a missing retrieval capability rather than a
display/pagination bug: the underlying need is "let me get back to a note
I already created," which only becomes painful once linear scrolling stops
being viable. That framing points to a use case centered on *finding* a
note (by search, filter, or similar), not on reformatting the list.

I scoped the use case narrowly to the retrieval need itself and left the
mechanism (search box vs. filters vs. sort) to the requirement/design
stage — the evidence doesn't specify how users expect to find notes, only
that they currently can't. A human reviewer should confirm this framing
matches what was actually observed/reported before a specific UI
mechanism is committed to in the requirement.
