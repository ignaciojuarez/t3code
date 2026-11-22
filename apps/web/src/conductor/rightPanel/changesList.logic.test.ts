import type { FileDiffMetadata } from "@pierre/diffs";
import { describe, expect, it } from "vite-plus/test";

import { changedFileRows } from "./changesList.logic";

function file(
  type: FileDiffMetadata["type"],
  name: string,
  hunks: ReadonlyArray<{ additionLines: number; deletionLines: number }> = [],
): FileDiffMetadata {
  return { type, name, hunks } as FileDiffMetadata;
}

describe("changedFileRows", () => {
  it("splits the directory from the name and counts parsed hunks", () => {
    expect(
      changedFileRows(
        [
          file("change", "apps/web/src/page.tsx", [
            { additionLines: 3, deletionLines: 1 },
            { additionLines: 2, deletionLines: 0 },
          ]),
          file("new", "README.md", [{ additionLines: 4, deletionLines: 0 }]),
          file("rename-pure", "docs/moved.md"),
        ],
        new Map(),
      ),
    ).toEqual([
      {
        path: "apps/web/src/page.tsx",
        directory: "apps/web/src",
        name: "page.tsx",
        status: "modified",
        additions: 5,
        deletions: 1,
      },
      {
        path: "README.md",
        directory: "",
        name: "README.md",
        status: "added",
        additions: 4,
        deletions: 0,
      },
      {
        path: "docs/moved.md",
        directory: "docs",
        name: "moved.md",
        status: "modified",
        additions: 0,
        deletions: 0,
      },
    ]);
  });

  it("takes a lazy source's per-path stats over unloaded hunks", () => {
    expect(
      changedFileRows(
        [file("deleted", "src/old.ts")],
        new Map([["src/old.ts", { additions: 0, deletions: 40 }]]),
      ),
    ).toMatchObject([{ path: "src/old.ts", status: "deleted", additions: 0, deletions: 40 }]);
  });

  it("folds a file-to-symlink pair into one modified row without double counting stats", () => {
    const pair = [
      file("deleted", "AGENTS.md", [{ additionLines: 0, deletionLines: 7 }]),
      file("new", "AGENTS.md", [{ additionLines: 1, deletionLines: 0 }]),
    ];
    expect(changedFileRows(pair, new Map())).toMatchObject([
      { path: "AGENTS.md", status: "modified", additions: 1, deletions: 7 },
    ]);
    expect(
      changedFileRows(pair, new Map([["AGENTS.md", { additions: 1, deletions: 7 }]])),
    ).toMatchObject([{ path: "AGENTS.md", status: "modified", additions: 1, deletions: 7 }]);
  });
});
