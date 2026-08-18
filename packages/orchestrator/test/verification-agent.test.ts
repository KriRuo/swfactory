import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { AgentRun, Slice } from "@sfai/artifacts";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { runVerificationAgent } from "../src/agents/verification/index.js";

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: vi.fn(),
}));

describe("runVerificationAgent", () => {
  const worktreePath = process.cwd();

  it(
    "falls back to a direct vitest run when the Claude SDK fails",
    { timeout: 30000 },
    async () => {
    vi.mocked(query).mockImplementation(async function* () {
      throw new Error("session limit");
    });

    const agentRun: AgentRun = {
      id: "AGENTRUN-0004",
      type: "agent-run",
      state: "pending",
      version: 1,
      createdAt: "2026-08-18T00:00:00.000Z",
      modifiedAt: "2026-08-18T00:00:00.000Z",
      createdBy: "orchestrator",
      modifiedBy: "orchestrator",
      provenance: { source: "orchestrator", reason: "reacting to ImplementationCompleted" },
      relationships: [],
      agentRole: "verification",
      trigger: "ImplementationCompleted",
      inputSnapshotRef: "event:10",
      action: "Independently verify the implementation against acceptance criteria",
      toolPermissions: ["Read", "Bash"],
      nextEvents: ["VerificationPassed"],
    };

    const slice: Slice = {
      id: "SLICE-0001",
      type: "slice",
      state: "approved",
      version: 1,
      createdAt: "2026-08-18T00:00:00.000Z",
      modifiedAt: "2026-08-18T00:00:00.000Z",
      createdBy: "agent:AGENTRUN-0003",
      modifiedBy: "agent:AGENTRUN-0003",
      provenance: { source: "architecture-planning-agent", reason: "planned from approved requirement" },
      relationships: [{ type: "implements", targetId: "REQ-0001" }],
      title: "Add title search to the notes API",
      approach: "Add a q query param to GET /notes that filters by title substring.",
      affectedComponents: ["fixtures/seed-app"],
      dependencies: [],
      testIntent: "GET /notes?q=milk returns only notes whose title contains 'milk'.",
    };

    const result = await runVerificationAgent(worktreePath, agentRun, slice);

    expect(result.success).toBe(true);
    expect(result.testOutput).toMatch(/\d+ passed/i);
    expect(result.output).toMatch(/\d+ passed/i);
    expect(existsSync(`${worktreePath}/fixtures/seed-app/test/notes.test.ts`)).toBe(true);
  });
});
