import { useAtomValue } from "@effect/atom-react";
import { thrownErrorMessage } from "@t3tools/client-runtime/errors";
import { resolvePullRequestDetailChecks } from "@t3tools/client-runtime/pull-request-checks";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import {
  isAtomCommandInterrupted,
  selectEnvironmentQueryData,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import {
  resolveThreadCurrentPullRequestLink,
  visibleThreadPullRequests,
} from "@t3tools/client-runtime/thread-pull-requests";
import type { ProjectId, PullRequestRef, ScopedThreadRef } from "@t3tools/contracts";
import { AsyncResult } from "effect/reactivity";
import { T, useGT, useMessages } from "gt-react";
import { ArrowUpIcon, ArrowUpRightIcon } from "lucide-react";
import { useState, type MouseEvent } from "react";

import { useOpenLink } from "~/browser/useOpenLink";
import { changeRequestTermKind } from "~/components/pullRequest/changeRequestTerm";
import {
  allowedPullRequestMergeMethods,
  classifyPullRequestChecks,
  isPullRequestConflicting,
  resolvePullRequestMergeMethod,
  resolveThreadPanelPullRequestAction,
  threadPullRequestPanelTarget,
} from "~/components/pullRequest/pullRequestDetail.logic";
import { PullRequestGlyph } from "~/components/pullRequest/pullRequestIcons";
import { useRightPanelStore } from "~/rightPanelStore";
import { resolvePullRequestState } from "~/components/pullRequest/pullRequestPresentation";
import {
  usePullRequestActionRunner,
  usePullRequestDefaultMergeMethodResolver,
} from "~/components/pullRequest/usePullRequestActions";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { isElectron } from "~/env";
import { useLiveRefresh } from "~/hooks/useLiveRefresh";
import { usePullRequestChecksRefresh } from "~/hooks/usePullRequestChecksRefresh";
import { useThreadRouteRef } from "~/hooks/useThreadRouteTarget";
import { m } from "~/i18n/messages";
import { cn, randomUUID } from "~/lib/utils";
import { useProject, useQuietThreadShell, useServerConfigs } from "~/state/entities";
import { pullRequestEnvironment } from "~/state/pullRequests";
import {
  useEnvironmentQueryIsNewer,
  useEnvironmentQueryRefresh,
  useEnvironmentQuerySelector,
} from "~/state/query";
import { useGitStackedAction, useSourceControlActionRunning } from "~/state/sourceControlActions";
import { chatGitStatusAtom, NO_CHAT_GIT_STATUS_ATOM, vcsEnvironment } from "~/state/vcs";
import { useUiStateStore } from "~/uiStateStore";
import { COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS } from "~/workspaceTitlebar";

import { branchStatusPrTarget, resolvePrStripStatus } from "./prStatusStrip.logic";
import { NO_STRIP_GIT_STATUS_ATOM, stripGitStatusAtom } from "./stripGitStatus";
import "./rightPanel.css";

const isSettledWithoutChecks = (result: AsyncResult.AsyncResult<unknown, unknown>) =>
  result._tag === "Success" && result.value === null;

interface PrStripTarget {
  readonly threadRef: ScopedThreadRef;
  readonly thread: EnvironmentThreadShell;
  readonly target: NonNullable<ReturnType<typeof threadPullRequestPanelTarget>>;
}

/**
 * The pull request the routed thread's panel opens, if the thread has one. A thread that has not
 * linked its branch's pull request yet, such as one an agent opened with the host's CLI, still
 * gets the strip from the checkout's git status.
 */
export function useThreadPrStripTarget(): PrStripTarget | null {
  const threadRef = useThreadRouteRef();
  const thread = useQuietThreadShell(threadRef);
  const project = useProject(
    threadRef === null || thread === null
      ? null
      : { environmentId: threadRef.environmentId, projectId: thread.projectId },
  );
  const cwd = thread?.worktreePath ?? project?.workspaceRoot ?? null;
  const gitStatus = useAtomValue(
    threadRef === null || cwd === null
      ? NO_CHAT_GIT_STATUS_ATOM
      : chatGitStatusAtom(
          vcsEnvironment.status({ environmentId: threadRef.environmentId, input: { cwd } }),
        ),
  );
  if (threadRef === null || thread === null) return null;
  const target =
    threadPullRequestPanelTarget({
      projectId: thread.projectId,
      pullRequests: visibleThreadPullRequests(thread.pullRequests),
      linkedPullRequest: thread.linkedPullRequest,
      branchPullRequest: thread.branchPullRequest,
    }) ??
    branchStatusPrTarget(thread.projectId, project?.repositoryIdentity, gitStatus?.pr ?? null);
  return target === null ? null : { threadRef, thread, target };
}

/** Sits in the window titlebar row above the panel tabs: the pull request, its state, and the next step. */
export function PrStatusStrip({
  threadRef,
  thread,
  target,
  inline,
  maximized,
}: PrStripTarget & { readonly inline: boolean; readonly maximized: boolean }) {
  const gt = useGT();
  const messages = useMessages();
  const environmentId = threadRef.environmentId;
  const project = useProject({ environmentId, projectId: thread.projectId });
  const cwd = thread.worktreePath ?? project?.workspaceRoot ?? null;
  const serverConfig = useServerConfigs().get(environmentId);
  const supportsChecks = serverConfig?.environment.capabilities.pullRequestChecks === true;
  const reference: PullRequestRef | null =
    serverConfig === undefined
      ? null
      : {
          projectId: target.projectId as ProjectId,
          ...("host" in target && target.host ? { host: target.host } : {}),
          repository: target.repository,
          number: target.number,
        };
  const detailAtom =
    reference === null
      ? null
      : pullRequestEnvironment.detail({
          environmentId,
          input: { ...reference, allowStale: false },
        });
  const detailData = useEnvironmentQuerySelector(detailAtom, selectEnvironmentQueryData);
  const detailQuery = useEnvironmentQueryRefresh(detailAtom);
  const checksAtom =
    supportsChecks && reference !== null && detailData !== null
      ? pullRequestEnvironment.checks({ environmentId, input: reference })
      : null;
  const checksData = useEnvironmentQuerySelector(checksAtom, selectEnvironmentQueryData);
  const checksSettledEmpty = useEnvironmentQuerySelector(checksAtom, isSettledWithoutChecks);
  const checksQuery = useEnvironmentQueryRefresh(checksAtom);
  const checksAreNewer = useEnvironmentQueryIsNewer(checksAtom, detailAtom);
  const detail = resolvePullRequestDetailChecks(detailData, checksData, checksAreNewer);
  const currentLink = resolveThreadCurrentPullRequestLink(thread.pullRequests);
  const snapshot = currentLink?.number === target.number ? currentLink.snapshot : null;
  const state = detail?.state ?? snapshot?.state ?? null;
  const isDraft = detail?.isDraft ?? snapshot?.isDraft ?? false;

  const refreshKey = `${environmentId}:${thread.projectId}:${reference?.host}:${reference?.repository}:${target.number}`;
  useLiveRefresh(
    () => {
      if (!detailQuery.isPending()) detailQuery.refresh();
    },
    {
      enabled: reference !== null && state === "open",
      key: `workspace-pr:${refreshKey}`,
      intervalMs: 10 * 60_000,
    },
  );
  usePullRequestChecksRefresh({
    refresh: () => {
      if (!checksQuery.isPending() && !detailQuery.isPending()) checksQuery.refresh();
    },
    enabled: state === "open" && supportsChecks && !checksSettledEmpty,
    key: `workspace-pr-checks:${refreshKey}`,
    checks: detail?.checks ?? [],
  });

  const gitScope = { environmentId, cwd };
  const gitStatus = useAtomValue(
    cwd === null
      ? NO_STRIP_GIT_STATUS_ATOM
      : stripGitStatusAtom(vcsEnvironment.status({ environmentId, input: { cwd } })),
  );
  const stackedAction = useGitStackedAction(gitScope);
  const gitActionRunning = useSourceControlActionRunning(gitScope, ["runStackedAction"]);

  const terminology = sourceControlClients.get(
    detail?.provider ?? project?.repositoryIdentity?.provider,
  ).changeRequest;
  const term = changeRequestTermKind(terminology);
  const { actionPending, perform } = usePullRequestActionRunner({
    environmentId,
    reference,
    terminology,
    onSuccess: () => checksQuery.refresh(),
  });
  const lastSelectedMergeMethod = useUiStateStore((ui) => ui.pullRequestMergeMethod);
  const resolveProjectDefaultMergeMethod = usePullRequestDefaultMergeMethodResolver(
    environmentId,
    thread.projectId,
  );
  const [confirmingMerge, setConfirmingMerge] = useState(false);
  const openLink = useOpenLink(threadRef);

  // Commit and push or push are only offered on the request's own branch, never another one.
  const onPullRequestBranch =
    gitStatus !== null &&
    gitStatus.refName !== null &&
    gitStatus.refName === (detail?.headBranch ?? snapshot?.headBranch);
  const aheadCount = onPullRequestBranch && gitStatus.hasUpstream ? gitStatus.aheadCount : 0;
  const checks = detail?.checks ?? [];
  const failedChecks = checks.filter(
    (check) => check.status === "failure" || check.status === "cancelled",
  ).length;
  const status =
    state === null
      ? null
      : resolvePrStripStatus({
          state,
          isDraft,
          hasWorkingTreeChanges: onPullRequestBranch && gitStatus.hasWorkingTreeChanges,
          aheadCount,
          conflicting: isPullRequestConflicting(detail),
          checks: detail === null ? "none" : classifyPullRequestChecks(detail.checks),
          mergeable: resolveThreadPanelPullRequestAction(detail) === "merge",
        });
  if (confirmingMerge && status !== "ready") setConfirmingMerge(false);
  const mergeMethod = resolvePullRequestMergeMethod(
    allowedPullRequestMergeMethods(detail),
    null,
    resolveProjectDefaultMergeMethod(),
    lastSelectedMergeMethod,
  );
  const mergeMethodKey = mergeMethod === "fast-forward" ? "fastForward" : mergeMethod;

  const label =
    status === null
      ? null
      : status === "uncommitted"
        ? gt("Uncommitted changes")
        : status === "ahead"
          ? gt("Ahead by {count, plural, one {# commit} other {# commits}}", {
              count: aheadCount,
            })
          : status === "ready"
            ? gt("Ready to merge")
            : status === "conflicts"
              ? gt("Merge conflicts")
              : status === "checks-failing"
                ? gt("{failed} / {total} checks failed", {
                    failed: failedChecks,
                    total: checks.length,
                  })
                : status === "checks-pending"
                  ? gt("Checks running")
                  : resolvePullRequestState({ state: state ?? "open", isDraft }, messages).label;

  const url = detail?.url ?? target.url;
  // Opens T3 Code's own pull request view in this panel; a modified click still opens the host.
  const openPullRequest = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      void openLink(url, { event });
      return;
    }
    openInApp();
  };
  function openInApp() {
    useRightPanelStore.getState().openPullRequest(threadRef, {
      projectId: target.projectId,
      ...("host" in target && target.host ? { host: target.host } : {}),
      repository: target.repository,
      number: target.number,
      url,
    });
  }
  const gitButtonDisabled = cwd === null || !stackedAction.isAllowed || gitActionRunning;

  const runGitAction = async (action: "commit_push" | "push") => {
    const result = await stackedAction.run({
      actionId: randomUUID(),
      action,
      threadId: thread.id,
    });
    if (result._tag === "Failure") {
      if (isAtomCommandInterrupted(result)) return;
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: gt("Action failed"),
          description:
            thrownErrorMessage(squashAtomCommandFailure(result), m) ?? gt("An error occurred."),
          data: { threadRef },
        }),
      );
      return;
    }
    const { toast } = result.value;
    toastManager.add(
      stackedThreadToast({
        type: "success",
        title: toast.title,
        ...(toast.description ? { description: toast.description } : {}),
        data: { threadRef },
      }),
    );
  };

  return (
    <div
      data-conductor-pr-strip={status ?? ""}
      className={cn(
        "flex h-[var(--workspace-topbar-height)] min-h-[var(--workspace-topbar-height)] shrink-0 items-center gap-2.5 border-b border-border px-3 text-sm",
        isElectron && inline && "drag-region wco:pr-(--workspace-native-controls-inset)",
        inline && maximized && COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS,
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              data-conductor-pr-chip
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 tabular-nums"
              aria-label={gt(
                "{term, select, mr {Merge request} cr {Change request} other {Pull request}} #{number}",
                { term, number: target.number },
              )}
              onClick={openPullRequest}
            />
          }
        >
          <span>
            {gt("{term, select, mr {MR} cr {CR} other {PR}} #{number}", {
              term,
              number: target.number,
            })}
          </span>
          <ArrowUpRightIcon aria-hidden className="size-3" />
        </TooltipTrigger>
        <TooltipPopup side="bottom">{detail?.title ?? snapshot?.title ?? url}</TooltipPopup>
      </Tooltip>
      {label === null ? (
        <span className="flex-1" />
      ) : (
        <span data-conductor-pr-label className="min-w-0 flex-1 truncate font-medium">
          {label}
        </span>
      )}
      {status === "uncommitted" || status === "ahead" ? (
        <button
          type="button"
          data-conductor-pr-action
          disabled={gitButtonDisabled}
          onClick={() => void runGitAction(status === "uncommitted" ? "commit_push" : "push")}
        >
          {gitActionRunning ? (
            <Spinner size="xs" aria-hidden />
          ) : status === "ahead" ? (
            <ArrowUpIcon aria-hidden className="size-3.5" />
          ) : null}
          {status === "uncommitted"
            ? gt("Commit and push")
            : gt("Push", { $context: "verb, git action" })}
        </button>
      ) : status === "checks-failing" || status === "conflicts" ? (
        // T3 Code's pull request view holds the fix-in-thread and conflict tools.
        <button type="button" data-conductor-pr-action onClick={openInApp}>
          {status === "checks-failing" ? gt("Fix errors") : gt("Resolve conflicts")}
        </button>
      ) : status === "ready" ? (
        <button
          type="button"
          data-conductor-pr-merge
          className="flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium disabled:cursor-default disabled:opacity-60"
          disabled={actionPending}
          onClick={() => setConfirmingMerge(true)}
        >
          <PullRequestGlyph.merged aria-hidden className="size-3.5" />
          {actionPending
            ? gt("Merging...")
            : gt("Merge", { $context: "verb, merges a pull request" })}
        </button>
      ) : null}
      <AlertDialog open={confirmingMerge} onOpenChange={setConfirmingMerge}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {gt(
                "Merge {term, select, mr {merge request} cr {change request} other {pull request}}?",
                { term },
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {gt(
                "This merges #{number} using {method, select, merge {merge} squash {squash} rebase {rebase} fastForward {fast-forward} other {merge}}.",
                { number: target.number, method: mergeMethodKey },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              <T>Cancel</T>
            </AlertDialogClose>
            <Button
              size="sm"
              disabled={actionPending}
              onClick={() => {
                setConfirmingMerge(false);
                void perform("merge", mergeMethod);
              }}
            >
              <T context="verb, merges a pull request">Merge</T>
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
