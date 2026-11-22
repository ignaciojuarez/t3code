import type { ScopedThreadRef } from "@t3tools/contracts";
import { useEffect } from "react";

import { useRightPanelStore } from "~/rightPanelStore";

/**
 * Gives a chat thread All files and Changes tabs the first time it is shown, opening the panel
 * when the thread has no saved panel yet. Waits for the repository check so a non-git project
 * gets no Changes tab.
 */
export function useConductorRightPanelDefault(input: {
  /** Null for drafts, embedded panes, and sheet layouts. */
  readonly threadRef: ScopedThreadRef | null;
  readonly filesAvailable: boolean;
  readonly isGitRepo: boolean | undefined;
}) {
  const { threadRef, filesAvailable, isGitRepo } = input;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- seeds the right panel store once per thread after git status reports whether the checkout is a repository
  useEffect(() => {
    if (threadRef === null || isGitRepo === undefined) return;
    const kinds = [
      ...(filesAvailable ? (["files"] as const) : []),
      ...(isGitRepo ? (["diff"] as const) : []),
    ];
    useRightPanelStore.getState().seedSurfaces(threadRef, kinds, "diff");
  }, [filesAvailable, isGitRepo, threadRef]);
}
