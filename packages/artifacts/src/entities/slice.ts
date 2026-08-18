import { z } from "zod";
import { baseArtifactSchema } from "../base.js";

export const sliceSchema = baseArtifactSchema.extend({
  type: z.literal("slice"),
  state: z.enum(["proposed", "approved", "in-progress", "done", "rejected"]),
  title: z.string().min(1),
  approach: z.string().min(1),
  affectedComponents: z.array(z.string().min(1)).default([]),
  dependencies: z.array(z.string().min(1)).default([]),
  testIntent: z.string().min(1),
});
export type Slice = z.infer<typeof sliceSchema>;
