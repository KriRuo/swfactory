import { z } from "zod";
import { evidenceSchema } from "./entities/evidence.js";
import { useCaseSchema } from "./entities/use-case.js";
import { requirementSchema } from "./entities/requirement.js";
import { acceptanceCriterionSchema } from "./entities/acceptance-criterion.js";
import { decisionSchema } from "./entities/decision.js";
import { sliceSchema } from "./entities/slice.js";
import { agentRunSchema } from "./entities/agent-run.js";
import { verificationResultSchema } from "./entities/verification-result.js";

export * from "./base.js";
export * from "./entities/evidence.js";
export * from "./entities/use-case.js";
export * from "./entities/requirement.js";
export * from "./entities/acceptance-criterion.js";
export * from "./entities/decision.js";
export * from "./entities/slice.js";
export * from "./entities/agent-run.js";
export * from "./entities/verification-result.js";
export * from "./markdown.js";

/** The `type` frontmatter value each artifact carries, doubling as its folder name under /product. */
export const schemaByType = {
  evidence: evidenceSchema,
  "use-case": useCaseSchema,
  requirement: requirementSchema,
  "acceptance-criterion": acceptanceCriterionSchema,
  decision: decisionSchema,
  slice: sliceSchema,
  "agent-run": agentRunSchema,
  "verification-result": verificationResultSchema,
} as const;

export type ArtifactType = keyof typeof schemaByType;

export const artifactSchema = z.discriminatedUnion("type", [
  evidenceSchema,
  useCaseSchema,
  requirementSchema,
  acceptanceCriterionSchema,
  decisionSchema,
  sliceSchema,
  agentRunSchema,
  verificationResultSchema,
]);
export type Artifact = z.infer<typeof artifactSchema>;
