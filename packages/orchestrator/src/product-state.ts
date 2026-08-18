import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseArtifactFile,
  serializeArtifactFile,
  folderByType,
  type Artifact,
  type ArtifactType,
  type ParsedArtifactFile,
  type Relationship,
} from "@sfai/artifacts";
import { gitAddCommit } from "./git.js";

/**
 * Full /product structure from 04_ARTIFACT_AND_TRACEABILITY_MODEL.md §2,
 * plus `runs/` (see folderByType in @sfai/artifacts for why agent-run
 * artifacts get a folder outside that list). Most of these folders have no
 * schema in this phase — they're created now so later phases don't need to
 * migrate an existing tree.
 */
export const PRODUCT_FOLDERS = [
  "intent",
  "evidence",
  "stakeholders",
  "use-cases",
  "requirements",
  "ux",
  "architecture",
  "decisions",
  "plans",
  "implementation",
  "tests",
  "quality",
  "operations",
  "telemetry",
  "runs",
] as const;

export function productRoot(repoRoot: string): string {
  return join(repoRoot, "product");
}

export function initProductTree(repoRoot: string): void {
  const root = productRoot(repoRoot);
  for (const folder of PRODUCT_FOLDERS) {
    mkdirSync(join(root, folder), { recursive: true });
  }
}

function artifactPath(repoRoot: string, type: ArtifactType, id: string): string {
  return join(productRoot(repoRoot), folderByType[type], `${id}.md`);
}

export interface WriteArtifactResult {
  filePath: string;
  commitHash: string;
}

/** Writes an artifact under /product and commits it — artifacts are versioned via git history, never silently overwritten in place. */
export async function writeArtifact(
  repoRoot: string,
  data: Artifact,
  body: string
): Promise<WriteArtifactResult> {
  const filePath = artifactPath(repoRoot, data.type as ArtifactType, data.id);
  writeFileSync(filePath, serializeArtifactFile(data, body));
  const message = `${data.type}(${data.id}): ${data.provenance.reason}`;
  const commitHash = await gitAddCommit(repoRoot, filePath, message);
  return { filePath, commitHash };
}

export function readArtifact(
  repoRoot: string,
  type: ArtifactType,
  id: string
): ParsedArtifactFile {
  const raw = readFileSync(artifactPath(repoRoot, type, id), "utf-8");
  return parseArtifactFile(raw);
}

export function listArtifacts(repoRoot: string, type?: ArtifactType): ParsedArtifactFile[] {
  const types = type ? [type] : (Object.keys(folderByType) as ArtifactType[]);
  const seenFolders = new Set<string>();
  const results: ParsedArtifactFile[] = [];

  for (const t of types) {
    const folder = folderByType[t];
    if (seenFolders.has(folder)) continue;
    seenFolders.add(folder);

    const dir = join(productRoot(repoRoot), folder);
    let files: string[];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const raw = readFileSync(join(dir, file), "utf-8");
      const parsed = parseArtifactFile(raw);
      if (!type || parsed.data.type === type) {
        results.push(parsed);
      }
    }
  }
  return results;
}

export interface RelationshipGraph {
  /** id -> relationships that artifact declares (outgoing edges). */
  outgoing: Map<string, Relationship[]>;
  /** id -> ids of artifacts that declare a relationship pointing at it (incoming edges). */
  incoming: Map<string, string[]>;
}

/**
 * Projects every artifact's `relationships[]` field into an in-memory graph,
 * on demand — per 04_ARTIFACT_AND_TRACEABILITY_MODEL.md §5, this is
 * deliberately not a graph database; it's rebuilt by parsing frontmatter
 * each time it's needed.
 */
export function buildRelationshipGraph(repoRoot: string): RelationshipGraph {
  const outgoing = new Map<string, Relationship[]>();
  const incoming = new Map<string, string[]>();

  for (const { data } of listArtifacts(repoRoot)) {
    outgoing.set(data.id, data.relationships);
    for (const rel of data.relationships) {
      const list = incoming.get(rel.targetId) ?? [];
      list.push(data.id);
      incoming.set(rel.targetId, list);
    }
  }

  return { outgoing, incoming };
}
