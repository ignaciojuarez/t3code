import type { VcsStatusResult } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { resolveConductorCreatePrAction } from "./createPrAction";

const status = (overrides: Partial<VcsStatusResult>): VcsStatusResult =>
  ({
    isRepo: true,
    refName: "feature/x",
    hasWorkingTreeChanges: false,
    hasUpstream: true,
    aheadCount: 0,
    behindCount: 0,
    aheadOfDefaultCount: 0,
    pr: null,
    ...overrides,
  }) as VcsStatusResult;

describe("resolveConductorCreatePrAction", () => {
  it("always says Create PR, committing and pushing first when there is uncommitted work", () => {
    const action = resolveConductorCreatePrAction(
      status({ hasWorkingTreeChanges: true }),
      false,
      true,
    );
    expect(action).toMatchObject({ label: "Create PR", action: "commit_push_pr", disabled: false });
  });

  it("pushes and opens the pull request for unpushed or unmerged commits", () => {
    expect(resolveConductorCreatePrAction(status({ aheadCount: 2 }), false, true)).toMatchObject({
      label: "Create PR",
      action: "create_pr",
    });
    expect(
      resolveConductorCreatePrAction(status({ aheadOfDefaultCount: 3 }), false, true),
    ).toMatchObject({ action: "create_pr" });
  });

  it("disappears once the branch has an open pull request", () => {
    const pr = {
      number: 1,
      title: "t",
      url: "u",
      baseRef: "main",
      headRef: "feature/x",
      state: "open",
    } as const;
    expect(resolveConductorCreatePrAction(status({ pr }), false, true)).toBeNull();
  });

  it("stays visible but disabled, with a reason, when there is nothing to open", () => {
    const action = resolveConductorCreatePrAction(status({}), false, true);
    expect(action).toMatchObject({ label: "Create PR", disabled: true, kind: "show_hint" });
    expect(action?.hint).toBeTruthy();
    expect(
      resolveConductorCreatePrAction(status({ behindCount: 1, aheadCount: 1 }), false, true),
    ).toMatchObject({ disabled: true });
    expect(
      resolveConductorCreatePrAction(status({ hasUpstream: false }), false, false),
    ).toMatchObject({ disabled: true });
  });
});
