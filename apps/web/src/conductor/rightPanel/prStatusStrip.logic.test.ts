import { ProjectId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { branchStatusPrTarget, resolvePrStripStatus } from "./prStatusStrip.logic";

const base = {
  state: "open",
  isDraft: false,
  hasWorkingTreeChanges: false,
  aheadCount: 0,
  conflicting: false,
  checks: "passing",
  mergeable: true,
} as const;

describe("resolvePrStripStatus", () => {
  it("puts local work first: uncommitted, then unpushed commits", () => {
    expect(resolvePrStripStatus({ ...base, hasWorkingTreeChanges: true, aheadCount: 2 })).toBe(
      "uncommitted",
    );
    expect(resolvePrStripStatus({ ...base, aheadCount: 2 })).toBe("ahead");
  });

  it("reports the pull request's own state once local work is pushed", () => {
    expect(resolvePrStripStatus(base)).toBe("ready");
    expect(resolvePrStripStatus({ ...base, conflicting: true })).toBe("conflicts");
    expect(resolvePrStripStatus({ ...base, mergeable: false, checks: "failing" })).toBe(
      "checks-failing",
    );
    expect(resolvePrStripStatus({ ...base, state: "merged" })).toBe("merged");
  });
});

describe("branchStatusPrTarget", () => {
  const projectId = ProjectId.make("p");
  const repository = { canonicalKey: "k", locator: {}, owner: "o", name: "r" } as never;

  it("targets the branch's open pull request when the repository is known", () => {
    expect(
      branchStatusPrTarget(projectId, repository, { number: 7, url: "u", state: "open" }),
    ).toEqual({ projectId, repository: "o/r", number: 7, url: "u" });
  });

  it("ignores closed pull requests and unnamed repositories", () => {
    expect(
      branchStatusPrTarget(projectId, repository, { number: 7, url: "u", state: "merged" }),
    ).toBeNull();
    expect(
      branchStatusPrTarget(projectId, undefined, { number: 7, url: "u", state: "open" }),
    ).toBeNull();
  });
});
