import { describe, expect, it } from "vitest";
import { appendEvent, openEventLog, readEvents } from "../src/event-log.js";

describe("event log", () => {
  it("appends and reads back events in order", () => {
    const db = openEventLog(":memory:");

    appendEvent(db, { type: "EvidenceAdded", payload: { id: "EVID-0001" }, actor: "human:kris" });
    appendEvent(db, {
      type: "RequirementChanged",
      payload: { id: "REQ-0001", change: "priority" },
      actor: "agent:AGENTRUN-0002",
    });

    const events = readEvents(db);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: "EvidenceAdded", payload: { id: "EVID-0001" } });
    expect(events[1].payload).toEqual({ id: "REQ-0001", change: "priority" });
  });

  it("filters by type", () => {
    const db = openEventLog(":memory:");
    appendEvent(db, { type: "EvidenceAdded", payload: {}, actor: "human:kris" });
    appendEvent(db, { type: "SliceApproved", payload: {}, actor: "human:kris" });

    expect(readEvents(db, { type: "SliceApproved" })).toHaveLength(1);
  });
});
