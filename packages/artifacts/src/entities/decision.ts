import { z } from "zod";
import { baseArtifactSchema } from "../base.js";

export const decisionSchema = baseArtifactSchema.extend({
  type: z.literal("decision"),
  state: z.enum(["proposed", "decided", "superseded"]),
  title: z.string().min(1),
  rationale: z.string().min(1),
  alternativesConsidered: z.array(z.string().min(1)).default([]),
});
export type Decision = z.infer<typeof decisionSchema>;
