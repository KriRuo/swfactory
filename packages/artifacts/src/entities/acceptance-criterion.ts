import { z } from "zod";
import { baseArtifactSchema } from "../base.js";

export const acceptanceCriterionSchema = baseArtifactSchema.extend({
  type: z.literal("acceptance-criterion"),
  state: z.enum(["draft", "approved", "verified", "failed"]),
  condition: z.string().min(1),
  testable: z.boolean(),
});
export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>;
