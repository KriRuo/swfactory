import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentRun, Slice } from "@sfai/artifacts";
import { git } from "../git.js";

export interface EngineeringRunResult {
  success: boolean;
  output: string;
  /** Whether HEAD in the worktree actually moved — a run that reports success but committed nothing is still a failure. */
  committed: boolean;
}

const SYSTEM_PROMPT = `You are the Engineering agent in an agentic software factory. Your job: implement one approved vertical slice of code, exactly as scoped, in the working directory you're given.

Rules:
- You are already inside the correct directory (a git worktree checked out on its own branch, scoped to just the code you're allowed to touch). Do not cd outside it, do not touch .git internals directly, do not run "git push".
- Implement exactly what the slice's "approach" describes - no unrelated refactoring, no scope creep, no touching files the slice doesn't name as affected.
- Add or update tests per the slice's "testIntent" - write real, specific test cases, not placeholders.
- Run the test suite yourself before finishing. Plain "npx vitest run" from here will NOT find this package's tests (the monorepo's vitest config lives at the repo root and only discovers tests when invoked from there) - use: (cd ../.. && npx vitest run fixtures/seed-app/test/notes.test.ts). This is a subshell "cd", scoped to that one command; it does not change your working directory for anything else. Fix failures. Do not finish with a failing test suite unless you clearly explain in your final message why (e.g. a pre-existing failure unrelated to this change).
- When you are satisfied, stage and commit your changes with "git add -A && git commit -m \\"<clear summary>\\"". This is required - your work isn't recorded until you commit it. Make one commit (or a few logically separate commits) with clear messages; do not leave changes uncommitted.
- Your final response to the user should summarize what you changed and confirm the test suite passes.`;

function buildPrompt(agentRun: AgentRun, slice: Slice): string {
  return `Task: ${agentRun.action}

## Slice (${slice.id}): ${slice.title}

### Approach
${slice.approach}

### Affected components
${slice.affectedComponents.map((c) => `- ${c}`).join("\n")}

### Test intent
${slice.testIntent}

Implement this now, run the tests, and commit your work when done.`;
}

/**
 * Runs a real Claude Agent SDK session for the Engineering role, scoped to
 * `<worktreePath>/fixtures/seed-app` via `cwd` (Read/Write/Edit resolve
 * relative to cwd; no `additionalDirectories` are granted). Unlike the
 * Product/RE and Architecture/Planning dispatchers, this one has `Bash` in
 * its allowlist and commits its own work — see the isolation caveats in
 * the phase-5 plan (`Bash` can `cd` outside `cwd`; this is an accepted
 * MVP-scope risk, not solved here).
 */
export async function runEngineeringAgent(worktreePath: string, agentRun: AgentRun, slice: Slice): Promise<EngineeringRunResult> {
  const seedAppDir = join(worktreePath, "fixtures", "seed-app");
  const prompt = buildPrompt(agentRun, slice);

  const headBefore = await git(worktreePath, ["rev-parse", "HEAD"]);

  let resultText = "";
  let success = false;

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      cwd: seedAppDir,
      allowedTools: ["Read", "Write", "Edit", "Bash"],
      disallowedTools: ["Bash(sudo *)", "Bash(rm -rf *)", "Bash(git push*)"],
      permissionMode: "dontAsk",
      maxTurns: 30,
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

  const headAfter = await git(worktreePath, ["rev-parse", "HEAD"]);
  const committed = headAfter !== headBefore;

  return { success, output: resultText || "(agent produced no result message)", committed };
}
