import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentRun, Requirement } from "@sfai/artifacts";

export interface ArchitecturePlanningRunResult {
  success: boolean;
  output: string;
}

const SYSTEM_PROMPT = `You are the Architecture/Planning agent in an agentic software factory. Your job: turn an approved Requirement into one vertical implementation Slice, written as a Markdown file with YAML frontmatter.

Rules:
- Write EXACTLY one file, at the exact path you are given in the prompt. Do not touch, read for editing, or delete any other file.
- Do not run any commands. You only have Read and Write tools.
- The file is YAML frontmatter (between --- lines) followed by a Markdown body. The frontmatter must be valid YAML and match the field list you're given exactly - no extra top-level fields, no missing ones.
- Use the exact "id" value you are given. Set createdBy and modifiedBy to the exact agent run id you are given (format: "agent:AGENTRUN-000N"). Set createdAt and modifiedAt to the current UTC time in the format 2026-08-18T12:00:00.000Z.
- version: 1. state: "approved" - this stage doesn't wait for human approval (it auto-advances per governance level L3), so do not set an approvalStatus field.
- relationships must include one entry: {type: implements, targetId: <the requirement id>}.
- This is a vertical slice, not a full design doc: pick the smallest concrete, buildable increment that satisfies the requirement. Name the actual affected components/files if you can infer them by reading the repo (you have Read access to it), and write a testIntent that's concrete enough for a Verification agent to check later.
- The Markdown body (after the closing --- ) should briefly narrate your reasoning for a human reviewer.`;

function buildPrompt(agentRun: AgentRun, requirement: Requirement, sliceId: string): string {
  return `Task: ${agentRun.action}

## Requirement (${requirement.id})
priority: ${requirement.priority}
statement: ${requirement.statement}

## File: product/plans/${sliceId}.md
Frontmatter fields (all required): id, type (must be "slice"), state (set to "approved"), version, createdAt, modifiedAt, createdBy, modifiedBy, provenance (object: source, reason), relationships, title, approach, affectedComponents (array of strings), dependencies (array of strings, can be empty), testIntent.
Set id: ${sliceId}. Set provenance.source to "architecture-planning-agent" and provenance.reason to a short phrase like "planned from approved requirement".

Write the file now.`;
}

/**
 * Runs a real Claude Agent SDK session for the Architecture/Planning role.
 * Same shape as runProductReAgent (../agents/product-re.ts) - the agent
 * writes its own file via the Write tool; discoverAndCommitProducts
 * (../orchestrator.ts) validates and commits it afterwards. Unlike
 * Product/RE, this stage auto-advances (L3) - the caller decides whether
 * to pass an `autoAdvanceEvent` to completeAgentRunFromDispatch based on
 * this function's `success` flag.
 */
export async function runArchitecturePlanningAgent(
  repoRoot: string,
  agentRun: AgentRun,
  requirement: Requirement,
  sliceId: string
): Promise<ArchitecturePlanningRunResult> {
  const prompt = buildPrompt(agentRun, requirement, sliceId);

  let resultText = "";
  let success = false;

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      cwd: repoRoot,
      allowedTools: ["Read", "Write"],
      permissionMode: "dontAsk",
    },
  })) {
    if (message.type === "result") {
      if (message.subtype === "success") {
        success = !message.is_error;
        resultText = message.result;
      } else {
        success = false;
        resultText = `Agent run ended with ${message.subtype}: ${message.errors.join("; ")}`;
      }
    }
  }

  return { success, output: resultText || "(agent produced no result message)" };
}
