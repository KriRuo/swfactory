import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Minimal git wrapper — just enough to make every /product write a real commit. */
export async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

export async function gitAddCommit(cwd: string, filePath: string, message: string): Promise<string> {
  await git(cwd, ["add", filePath]);
  await git(cwd, ["commit", "-m", message]);
  return git(cwd, ["rev-parse", "HEAD"]);
}

/** Creates an isolated worktree on a new branch for a single work slice. */
export async function createWorktree(repoRoot: string, worktreePath: string, branchName: string): Promise<void> {
  await git(repoRoot, ["worktree", "add", "-b", branchName, worktreePath]);
}

/**
 * `npm install` in a freshly created worktree — `git worktree add` checks
 * out tracked files only, no `node_modules`. `--ignore-scripts` blocks
 * arbitrary pre/postinstall commands from a worktree's package.json
 * (defense-in-depth against a future untrusted seed app; this project's
 * own has none). `shell: true` is required on Windows, where npm is a
 * .cmd shim `execFile` can't invoke directly — safe here because argv is
 * always this fixed, hardcoded array, never externally-controlled input.
 */
export async function runInstall(worktreePath: string): Promise<void> {
  await execFileAsync("npm", ["install", "--ignore-scripts"], { cwd: worktreePath, shell: true });
}
