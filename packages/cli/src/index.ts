import type { ArtifactType } from "@sfai/artifacts";
import { submit } from "./commands/submit.js";
import { approve } from "./commands/approve.js";
import { plan } from "./commands/plan.js";
import { status } from "./commands/status.js";

const [, , command, ...rest] = process.argv;

function flag(args: string[], name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();

  switch (command) {
    case "submit": {
      const summary = rest.find((a) => !a.startsWith("--"));
      if (!summary) {
        console.error('Usage: cli submit "<need description>" [--actor human:name]');
        process.exitCode = 1;
        return;
      }
      await submit(repoRoot, summary, flag(rest, "actor", "human:cli-user"));
      break;
    }
    case "approve": {
      const [type, id] = rest.filter((a) => !a.startsWith("--"));
      if (!type || !id) {
        console.error("Usage: cli approve <type> <id> [--as human:name]");
        process.exitCode = 1;
        return;
      }
      await approve(repoRoot, type as ArtifactType, id, flag(rest, "as", "human:cli-user"));
      break;
    }
    case "plan": {
      const requirementId = rest.find((a) => !a.startsWith("--"));
      if (!requirementId) {
        console.error("Usage: cli plan <requirementId>");
        process.exitCode = 1;
        return;
      }
      await plan(repoRoot, requirementId);
      break;
    }
    case "status":
      status(repoRoot);
      break;
    default:
      console.error("Usage: cli <submit|approve|plan|status> ...");
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
