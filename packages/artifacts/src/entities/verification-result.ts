import { z } from "zod";
import { baseArtifactSchema } from "../base.js";

export const verificationResultSchema = baseArtifactSchema.extend({
  type: z.literal("verification-result"),
  state: z.enum(["recorded"]),
  method: z.enum(["automated-test", "llm-review"]),
  outcome: z.enum(["pass", "fail"]),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  details: z.string().min(1),
});
export type VerificationResult = z.infer<typeof verificationResultSchema>;
