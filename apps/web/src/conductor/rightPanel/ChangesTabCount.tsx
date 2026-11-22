import { useMessages } from "gt-react";

import {
  selectThreadBranchBaseRef,
  useDiffPanelSessionStore,
  useDiffPanelStore,
} from "~/diffPanelStore";
import { useThreadRouteRef } from "~/hooks/useThreadRouteTarget";
import { useClientSettings } from "~/hooks/useSettings";
import { useProject, useQuietThreadShell } from "~/state/entities";
import { useFilesystemReadAccess } from "~/state/filesystem";
import { useEnvironmentQuery } from "~/state/query";
import { reviewEnvironment } from "~/state/review";
import { revisionedQuery } from "~/state/revisionedQuery";
import { vcsEnvironment } from "~/state/vcs";

import "./rightPanel.css";

/** Files changed on the thread's branch, read like the Diff panel's Changes scope so both share one result. */
function useChangedFileCount(): number | null {
  const messages = useMessages();
  const threadRef = useThreadRouteRef();
  const thread = useQuietThreadShell(threadRef);
  const project = useProject(
    thread ? { environmentId: thread.environmentId, projectId: thread.projectId } : null,
  );
  const environmentId = thread?.environmentId ?? null;
  const cwd = thread?.worktreePath ?? project?.workspaceRoot ?? null;
  const { canReadFiles } = useFilesystemReadAccess(environmentId, messages);
  const baseRef = useDiffPanelStore((state) => selectThreadBranchBaseRef(state, threadRef));
  const ignoreWhitespaceSetting = useClientSettings((settings) => settings.diffIgnoreWhitespace);
  const ignoreWhitespace =
    useDiffPanelSessionStore((state) => state.ignoreWhitespace) ?? ignoreWhitespaceSetting;
  const status = useEnvironmentQuery(
    environmentId !== null && cwd !== null
      ? vcsEnvironment.status({ environmentId, input: { cwd } })
      : null,
  ).data;
  // Status totals stand in for edits, pulls and resets, which bump no workspace mutation id.
  const revision = status
    ? JSON.stringify([
        status.refName,
        status.workingTree.files.length,
        status.workingTree.insertions,
        status.workingTree.deletions,
        status.branchChanges?.baseRef,
        status.branchChanges?.insertions,
        status.branchChanges?.deletions,
      ])
    : null;
  const preview = useEnvironmentQuery(
    status?.isRepo && canReadFiles && revision !== null && environmentId !== null && cwd !== null
      ? revisionedQuery(
          reviewEnvironment.diffPreview({
            environmentId,
            input: {
              cwd,
              ...(baseRef ? { baseRef } : {}),
              ignoreWhitespace,
              metadataOnly: true,
              sourceKind: "branch-range",
            },
          }),
          revision,
        )
      : null,
  ).data;
  return preview?.sources.find((source) => source.kind === "branch-range")?.files?.length ?? null;
}

export function ChangesTabCount() {
  const count = useChangedFileCount();
  if (count === null) return null;
  return <span className="ms-1.5 shrink-0 text-muted-foreground tabular-nums">{count}</span>;
}
