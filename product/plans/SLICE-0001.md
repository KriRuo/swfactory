---
id: SLICE-0001
type: slice
state: approved
version: 1
createdAt: '2026-08-18T13:18:00.000Z'
modifiedAt: '2026-08-18T13:18:00.000Z'
createdBy: 'agent:AGENTRUN-0002'
modifiedBy: 'agent:AGENTRUN-0002'
provenance:
  source: architecture-planning-agent
  reason: planned from approved requirement
relationships:
  - type: implements
    targetId: REQ-0001
title: Keyword search over note title and body via GET /notes?q=
approach: >-
  Extend the existing GET /notes endpoint in fixtures/seed-app/src/app.ts with
  an optional `q` query-string parameter instead of introducing a new route.
  When `q` is absent or blank, behavior is unchanged (full list, ordered by
  id). When `q` is present, run a parameterized, case-insensitive SQL LIKE
  match against both `title` and `body` columns
  (`WHERE lower(title) LIKE ? OR lower(body) LIKE ?` with `%q%` bound
  parameters, lower-cased on both sides) and return only matching notes as a
  JSON array in the same shape as the unfiltered list. This is the smallest
  change that satisfies REQ-0001: it reuses the current single-table schema
  (no migration), reuses the existing response contract (array of Note), adds
  no new dependency (node:sqlite already supports LIKE), and requires no
  client/UI change since fixtures/seed-app currently exposes an HTTP API only
  (no frontend in this fixture). Substring LIKE matching is chosen over
  full-text search (FTS5) or a ranking/relevance model as the minimum
  mechanism that resolves the "can't find a note" failure described in the
  requirement's evidence; ranking, live-as-you-type, and a screenful-based
  trigger are explicitly deferred, consistent with the requirement's own
  "left open for Architecture/Planning" note, and can become follow-on
  requirements if evidenced.
affectedComponents:
  - fixtures/seed-app/src/app.ts
  - fixtures/seed-app/test/notes.test.ts
dependencies: []
testIntent: >-
  Add a `describe("GET /notes?q=")` block to
  fixtures/seed-app/test/notes.test.ts covering: (1) a match on `title` only
  (e.g. create "Groceries"/"Milk, eggs" and "Meeting notes"/"agenda", search
  `q=Groceries`, expect 200 and exactly the Groceries note); (2) a match on
  `body` only (search a term that appears only in a note's body, e.g.
  `q=agenda`, expect exactly that note); (3) case-insensitive matching (search
  `q=GROCERIES` still matches the "Groceries" note); (4) no matches returns
  200 with an empty array, not a 404; (5) an absent or empty `q` returns the
  full unfiltered list unchanged (regression guard on existing GET /notes
  behavior); (6) a `q` value containing SQL wildcard characters (`%`, `_`) or
  quote characters does not error and does not return unrelated rows,
  confirming the parameterized query is not vulnerable to injection or
  wildcard abuse. A Verification agent should run `npm test` (vitest) from
  the repo root and confirm all new and existing notes.test.ts cases pass.
---

## Reasoning

REQ-0001 asks for keyword search across a note's title and body that returns
matching notes, so a user can find a note once the list exceeds one
screenful. Reading the current seed app (`fixtures/seed-app`), it's a small
Express + `node:sqlite` API with four routes (`POST/GET/GET :id/DELETE
/notes`) and no frontend — `GET /notes` already returns the full list as a
JSON array ordered by id, and `notes` is a single flat table with `title`,
`body`, `createdAt` columns and no existing index or FTS setup.

Given that, the smallest vertical slice is to make `GET /notes` accept an
optional `q` query parameter and filter server-side, rather than adding a new
`/notes/search` route or a client-side filter (there is no client in this
fixture yet) or a schema change (FTS5 virtual table, added indexes). This:

- Satisfies the requirement literally (matches title and body, returns
  matching notes).
- Keeps the existing response contract and route, so it's additive and
  backward compatible — no existing caller of `GET /notes` breaks.
- Needs no new dependency and no migration, since `node:sqlite` supports
  `LIKE` directly and the table already has the two columns to search.
- Is fully testable within the existing `supertest` + `vitest` harness in
  `fixtures/seed-app/test/notes.test.ts`, using an in-memory DB exactly like
  the current tests.

Left out of this slice, deliberately: relevance ranking, full-text/FTS5
indexing, live-as-you-type behavior, and any "screenful" threshold for
surfacing a search UI — REQ-0001 itself flags these as open questions for
this stage, and there's no evidence yet to justify the added complexity.
Substring `LIKE` matching is the minimum mechanism that turns "can't find a
note in a long list" into "can find it by typing part of the title or body,"
which is exactly the failure the requirement's originating evidence
describes. If search performance or ranking quality becomes a problem at
larger note counts, that's a follow-on requirement backed by new evidence,
not something to speculatively build now.
</content>
