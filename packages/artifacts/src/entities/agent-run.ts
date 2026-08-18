import { z } from "zod";
import { baseArtifactSchema } from "../base.js";

/**
 * Mirrors the transition contract in 05_ORCHESTRATION_AND_LOOP_SPEC.md §3.
 * `confidence` is inherited from the base schema rather than duplicated here.
 */
export const agentRunSchema = baseArtifactSchema.extend({
  type: z.literal("agent-run"),
  state: z.enum(["pending", "running", "succeeded", "failed"]),
  agentRole: z.enum([
    "orchestrator",
    "product-re",
    "architecture-planning",
    "engineering",
    "verification",
  ]),
  trigger: z.string().min(1),
  inputSnapshotRef: z.string().min(1),
  action: z.string().min(1),
  toolPermissions: z.array(z.string().min(1)).default([]),
  output: z.string().min(1).optional(),
  validationResult: z.string().min(1).optional(),
  stateDelta: z.string().min(1).optional(),
  nextEvents: z.array(z.string().min(1)).default([]),
});
export type AgentRun = z.infer<typeof agentRunSchema>;
