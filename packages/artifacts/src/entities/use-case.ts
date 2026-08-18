import { z } from "zod";
import { baseArtifactSchema } from "../base.js";

export const useCaseSchema = baseArtifactSchema.extend({
  type: z.literal("use-case"),
  state: z.enum(["draft", "proposed", "approved", "rejected"]),
  title: z.string().min(1),
  actors: z.array(z.string().min(1)).default([]),
  goal: z.string().min(1),
});
export type UseCase = z.infer<typeof useCaseSchema>;
