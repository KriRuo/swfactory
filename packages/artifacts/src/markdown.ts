import matter from "gray-matter";
import { artifactSchema, schemaByType, type Artifact, type ArtifactType } from "./index.js";

export interface ParsedArtifactFile {
  data: Artifact;
  body: string;
}

/** Parses a Markdown+YAML-frontmatter file, validating frontmatter against the schema for its `type`. */
export function parseArtifactFile(raw: string): ParsedArtifactFile {
  const parsed = matter(raw);
  const type = parsed.data?.type as string | undefined;
  if (!type || !(type in schemaByType)) {
    throw new Error(`Unknown or missing artifact "type" in frontmatter: ${String(type)}`);
  }
  const schema = schemaByType[type as ArtifactType];
  const data = schema.parse(parsed.data) as Artifact;
  return { data, body: parsed.content.trim() };
}

/** Serializes an artifact back to Markdown+YAML-frontmatter, validating first. */
export function serializeArtifactFile(data: Artifact, body: string): string {
  const validated = artifactSchema.parse(data);
  // js-yaml (via gray-matter) can't dump explicit `undefined` values — an
  // optional field set to `undefined` rather than omitted (common when
  // spreading a partial update) must become a genuinely absent key.
  const withoutUndefined = JSON.parse(JSON.stringify(validated));
  return matter.stringify(`${body}\n`, withoutUndefined);
}

/**
 * Folder each artifact type lives under within /product, per
 * 04_ARTIFACT_AND_TRACEABILITY_MODEL.md §2. `acceptance-criterion` is grouped
 * under `requirements/` (no dedicated folder in the spec's structure) and
 * `agent-run` lives under `runs/`, an extension beyond §2's list — agent runs
 * are execution provenance, not product content, so they don't fit any of
 * the listed folders.
 */
export const folderByType: Record<ArtifactType, string> = {
  evidence: "evidence",
  "use-case": "use-cases",
  requirement: "requirements",
  "acceptance-criterion": "requirements",
  decision: "decisions",
  slice: "plans",
  "agent-run": "runs",
  "verification-result": "tests",
};
