import type { VcsStatusResult } from "@t3tools/contracts";
import { msg } from "gt-react";

import type { GitQuickAction } from "~/components/GitActionsControl.logic";
import { m, type MessageResolver } from "~/i18n/messages";

/**
 * The top bar's only git action, Conductor style: always "Create PR". With uncommitted work it
 * commits, pushes and opens the pull request in one go; with commits only, it pushes and opens
 * it. Returns null once the branch has an open pull request, because the PR strip above the
 * right panel then offers the next step (commit and push, push, merge).
 */
export function resolveConductorCreatePrAction(
  gitStatus: VcsStatusResult | null,
  isBusy: boolean,
  hasPrimaryRemote: boolean,
  resolve: MessageResolver = m,
): GitQuickAction | null {
  if (gitStatus?.pr?.state === "open") return null;
  const label = resolve(msg("Create PR", { $context: "button, opens a pull request" }));
  const unavailable = (hint: string): GitQuickAction => ({
    label,
    disabled: true,
    kind: "show_hint",
    hint,
  });
  if (isBusy) return unavailable(resolve(msg("Git action in progress.")));
  if (gitStatus === null) return unavailable(resolve(msg("Git status is unavailable.")));
  if (gitStatus.refName === null) {
    return unavailable(resolve(msg("Check out a branch before creating a pull request.")));
  }
  if (!gitStatus.hasUpstream && !hasPrimaryRemote) {
    return unavailable(resolve(msg('Add an "origin" remote before creating a pull request.')));
  }
  const isAhead = gitStatus.aheadCount > 0;
  const isBehind = gitStatus.behindCount > 0;
  if (isAhead && isBehind) {
    return unavailable(resolve(msg("Branch has diverged from upstream. Rebase/merge first.")));
  }
  if (isBehind) {
    return unavailable(resolve(msg("Branch is behind upstream. Pull/rebase first.")));
  }
  if (gitStatus.hasWorkingTreeChanges) {
    return { label, disabled: false, kind: "run_action", action: "commit_push_pr" };
  }
  if (isAhead || (gitStatus.aheadOfDefaultCount ?? 0) > 0) {
    return { label, disabled: false, kind: "run_action", action: "create_pr" };
  }
  return unavailable(resolve(msg("No changes to open a pull request with yet.")));
}
