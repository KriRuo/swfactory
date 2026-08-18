import { z } from "zod";
import { baseArtifactSchema } from "../base.js";

export const evidenceSchema = baseArtifactSchema.extend({
  type: z.literal("evidence"),
  state: z.enum(["new", "reviewed", "archived"]),
  kind: z.enum(["observation", "source", "stakeholder-input"]),
  summary: z.string().min(1),
});
export type Evidence = z.infer<typeof evidenceSchema>;
