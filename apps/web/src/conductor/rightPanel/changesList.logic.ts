import type { FileDiffMetadata } from "@pierre/diffs";

import { resolveFileDiffPath } from "~/lib/diffRendering";

export type ChangedFileStatus = "added" | "modified" | "deleted";

interface ChangedFileRow {
  readonly path: string;
  readonly directory: string;
  readonly name: string;
  readonly status: ChangedFileStatus;
  readonly additions: number;
  readonly deletions: number;
}

function splitChangedPath(path: string): { directory: string; name: string } {
  const slash = path.lastIndexOf("/");
  return slash < 0
    ? { directory: "", name: path }
    : { directory: path.slice(0, slash), name: path.slice(slash + 1) };
}

function changedFileStatus(type: FileDiffMetadata["type"]): ChangedFileStatus {
  switch (type) {
    case "new":
      return "added";
    case "deleted":
      return "deleted";
    case "change":
    case "rename-pure":
    case "rename-changed":
      return "modified";
  }
}

/**
 * One row per changed path, in diff order. Lazy sources carry per-path stats; parsed patches
 * count their hunks. A path listed twice (a file replaced by a symlink) reads as modified.
 */
export function changedFileRows(
  files: ReadonlyArray<FileDiffMetadata>,
  stats: ReadonlyMap<string, { readonly additions: number; readonly deletions: number }>,
): ReadonlyArray<ChangedFileRow> {
  const rows = new Map<string, ChangedFileRow>();
  for (const file of files) {
    const path = resolveFileDiffPath(file);
    const status = changedFileStatus(file.type);
    const stat = stats.get(path);
    const additions =
      stat?.additions ?? file.hunks.reduce((total, hunk) => total + hunk.additionLines, 0);
    const deletions =
      stat?.deletions ?? file.hunks.reduce((total, hunk) => total + hunk.deletionLines, 0);
    const previous = rows.get(path);
    rows.set(
      path,
      previous === undefined
        ? { path, ...splitChangedPath(path), status, additions, deletions }
        : {
            ...previous,
            status: previous.status === status ? status : "modified",
            additions: stat ? additions : previous.additions + additions,
            deletions: stat ? deletions : previous.deletions + deletions,
          },
    );
  }
  return [...rows.values()];
}
