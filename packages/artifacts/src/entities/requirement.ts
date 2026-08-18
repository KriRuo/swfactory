import { z } from "zod";
import { baseArtifactSchema } from "../base.js";

export const requirementSchema = baseArtifactSchema.extend({
  type: z.literal("requirement"),
  state: z.enum(["draft", "proposed", "approved", "rejected", "verified"]),
  statement: z.string().min(1),
  priority: z.enum(["must", "should", "could", "wont"]),
});
export type Requirement = z.infer<typeof requirementSchema>;
