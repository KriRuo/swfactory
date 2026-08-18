import { mkdirSync } from "node:fs";
import { join } from "node:path";

/** Persistent, gitignored event-log location — `submit` and `approve` are separate process invocations, so state must survive between them. */
export function eventLogPath(repoRoot: string): string {
  const dir = join(repoRoot, ".sfai");
  mkdirSync(dir, { recursive: true });
  return join(dir, "events.sqlite");
}
