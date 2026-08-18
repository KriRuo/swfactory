import { z } from "zod";

/**
 * Shared frontmatter fields every artifact type carries, per
 * 04_ARTIFACT_AND_TRACEABILITY_MODEL.md §3 "Minimum Artifact Metadata".
 */
export const relationshipSchema = z.object({
  type: z.string().min(1),
  targetId: z.string().min(1),
});
export type Relationship = z.infer<typeof relationshipSchema>;

export const provenanceSchema = z.object({
  source: z.string().min(1),
  agentRunId: z.string().min(1).optional(),
  reason: z.string().min(1),
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const baseArtifactSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
  createdBy: z.string().min(1),
  modifiedBy: z.string().min(1),
  provenance: provenanceSchema,
  relationships: z.array(relationshipSchema).default([]),
  confidence: z.number().min(0).max(1).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  verificationStatus: z.enum(["unverified", "passed", "failed"]).optional(),
});
export type BaseArtifact = z.infer<typeof baseArtifactSchema>;
