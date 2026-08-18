import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentRun, Evidence } from "@sfai/artifacts";

export interface ProductReDispatchIds {
  useCaseId: string;
  requirementId: string;
}

export interface ProductReRunResult {
  success: boolean;
  output: string;
}

const SYSTEM_PROMPT = `You are the Product/RE agent in an agentic software factory. Your job: turn a piece of Evidence into a proposed UseCase and Requirement, written as Markdown files with YAML frontmatter.

Rules:
- Write EXACTLY two files, at the exact paths you are given in the prompt. Do not touch, read for editing, or delete any other file.
- Do not run any commands. You only have Read and Write tools.
- Each file is YAML frontmatter (between --- lines) followed by a Markdown body. The frontmatter must be valid YAML and match the field list you're given exactly - no extra top-level fields, no missing ones.
- Use the exact "id" values you are given. Set createdBy and modifiedBy to the exact agent run id you are given (format: "agent:AGENTRUN-000N"). Set createdAt and modifiedAt to the current UTC time in the format 2026-08-18T12:00:00.000Z.
- version: 1 for both files.
- The requirement's relationships field must include one entry: {type: derivedFrom, targetId: <the use case id>}. The use case's relationships field must include one entry: {type: derivedFrom, targetId: <the evidence id>}.
- The requirement must have approvalStatus: pending - a human reviews it before the loop continues. Do not set approvalStatus on the use case.
- Do real requirements-engineering judgment: read the evidence, decide what use case and requirement it actually justifies. Do not write placeholder or templated text - write specific, concrete content grounded in the evidence given.
- The Markdown body (after the closing --- ) should briefly narrate your reasoning for a human reviewer.`;

function buildPrompt(agentRun: AgentRun, evidence: Evidence, ids: ProductReDispatchIds): string {
  return `Task: ${agentRun.action}

## Evidence (${evidence.id})
kind: ${evidence.kind}
summary: ${evidence.summary}

## File 1: product/use-cases/${ids.useCaseId}.md
Frontmatter fields (all required): id, type (must be "use-case"), state (set to "proposed"), version, createdAt, modifiedAt, createdBy, modifiedBy, provenance (object: source, reason), relationships, title, actors (array of strings), goal.
Set id: ${ids.useCaseId}. Set provenance.source to "product-re-agent" and provenance.reason to a short phrase like "derived from evidence".

## File 2: product/requirements/${ids.requirementId}.md
Frontmatter fields (all required): id, type (must be "requirement"), state (set to "proposed"), version, createdAt, modifiedAt, createdBy, modifiedBy, provenance (object: source, reason), relationships, approvalStatus (set to "pending"), statement, priority (one of: must, should, could, wont).
Set id: ${ids.requirementId}. Set provenance.source to "product-re-agent" and provenance.reason to a short phrase like "derived from evidence".

Write both files now.`;
}

/**
 * Runs a real Claude Agent SDK session for the Product/RE role. The agent
 * writes both artifact files itself via its own Write tool, scoped to
 * `repoRoot` with a Read+Write-only allowlist — see
 * `discoverAndCommitProducts` in ../orchestrator.ts for what happens next
 * (this function does not write, validate, or commit anything).
 */
export async function runProductReAgent(
  repoRoot: string,
  agentRun: AgentRun,
  evidence: Evidence,
  ids: ProductReDispatchIds
): Promise<ProductReRunResult> {
  const prompt = buildPrompt(agentRun, evidence, ids);

  let resultText = "";
  let success = false;

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      cwd: repoRoot,
      allowedTools: ["Read", "Write"],
      // Denies anything outside the allowlist rather than bypassing all
      // permission checks - a better fit for a two-tool, no-Bash session.
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
