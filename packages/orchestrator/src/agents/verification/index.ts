import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentRun, Slice } from "@sfai/artifacts";

export interface VerificationRunResult {
  success: boolean;
  output: string;
  /** Raw test output from stdout/stderr. */
  testOutput: string;
}

const SYSTEM_PROMPT = `You are the Verification agent in an agentic software factory. Your job: independently verify that an implemented slice meets its acceptance criteria.

Rules:
- You are in a git worktree that contains the implementation. You have read-only access (no Write/Edit tools) and can run bash commands.
- Do NOT make changes to the code; your role is to verify, not to fix.
- Run the test suite to verify the implementation: (cd ../.. && npx vitest run fixtures/seed-app/test/notes.test.ts)
  - This subshell cd is scoped; it doesn't affect your working directory for subsequent commands.
  - Capture and parse the output to extract: number of tests passed, number of tests failed, key test names and results.
- If tests fail, explain which tests failed and why (based on the output you see).
- Your final response should include the complete test output and a summary (PASS if all tests passed, FAIL if any failed).
- Do NOT try to write files yourself — the orchestrator will handle artifact creation. Just report the test results clearly.`;

function buildPrompt(agentRun: AgentRun, slice: Slice): string {
  return `Task: ${agentRun.action}

## Slice (${slice.id}): ${slice.title}

### Implementation approach
${slice.approach}

### Test intent
${slice.testIntent}

Run the test suite now and report the results clearly.`;
}

/**
 * Runs a real Claude Agent SDK session for the Verification role.
 * The agent only has Read + Bash (no Write/Edit), and just runs tests.
 * It returns the test output, which the CLI command will use to create the VerificationResult artifact.
 */
export async function runVerificationAgent(
  worktreePath: string,
  agentRun: AgentRun,
  slice: Slice
): Promise<VerificationRunResult> {
  const seedAppDir = join(worktreePath, "fixtures", "seed-app");
  const prompt = buildPrompt(agentRun, slice);

  let resultText = "";
  let testOutput = "";
  let success = false;

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      cwd: seedAppDir,
      allowedTools: ["Read", "Bash"],
      disallowedTools: ["Bash(sudo *)", "Bash(rm -rf *)", "Bash(git push*)"],
      permissionMode: "dontAsk",
      maxTurns: 30,
    },
  })) {
    if (message.type === "result") {
      if (message.subtype === "success") {
        success = !message.is_error;
        resultText = message.result;
        // Extract test output from the result
        testOutput = resultText;
      } else {
        success = false;
        resultText = `Agent run ended with ${message.subtype}: ${message.errors.join("; ")}`;
        testOutput = resultText;
      }
    }
  }

  return {
    success,
    output: resultText || "(agent produced no result message)",
    testOutput,
  };
}

