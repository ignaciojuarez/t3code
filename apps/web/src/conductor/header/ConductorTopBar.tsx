import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { isScratchProject } from "@t3tools/client-runtime/state/projects";
import type {
  EditorId,
  EnvironmentId,
  ProjectId,
  ResolvedKeybindingsConfig,
  ThreadId,
} from "@t3tools/contracts";
import { useGT } from "gt-react";
import { BotIcon, EllipsisIcon } from "lucide-react";
import type { ReactNode } from "react";

import { BranchToolbar } from "~/components/BranchToolbar";
import type { EnvMode, EnvironmentOption } from "~/components/BranchToolbar.logic";
import GitActionsControl from "~/components/GitActionsControl";
import { OpenInPicker } from "~/components/chat/OpenInPicker";
import {
  PanelLayoutControls,
  type PanelLayoutControlsProps,
} from "~/components/chat/PanelLayoutControls";
import { ThreadRelationshipsPanel } from "~/components/chat/ThreadRelationshipsControl";
import { Button } from "~/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import type { DraftId } from "~/composerDraftStore";
import { useProject, useServerConfigs } from "~/state/entities";

interface ConductorTopBarActionsProps {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
  readonly projectId: ProjectId;
  readonly worktreePath: string | null;
  readonly isServerThread: boolean;
  readonly draftId?: DraftId;
  readonly forceNewWorktree: boolean;
  readonly isGitRepo: boolean;
  readonly envLocked: boolean;
  readonly envMode: EnvMode;
  readonly onEnvModeChange: (mode: EnvMode) => void;
  readonly startFromOrigin: boolean;
  readonly onStartFromOriginChange: (startFromOrigin: boolean) => void;
  readonly availableEnvironments: readonly EnvironmentOption[];
  readonly autoEnvironmentLabel: string | undefined;
  readonly onAutoEnvironment: (() => void) | undefined;
  readonly onEnvironmentChange?: (environmentId: EnvironmentId) => void;
  readonly keybindings: ResolvedKeybindingsConfig;
  readonly availableEditors: ReadonlyArray<EditorId>;
  readonly showOpenInPicker: boolean;
  readonly openInShortcutEnabled: boolean;
  readonly gitCwd: string | null;
  readonly workspaceMutationId: string | null;
  /** The panel toggles, last in the bar. */
  readonly children?: ReactNode;
}

/**
 * The chat top bar's right side, icons only: subagents, a "more" menu holding the environment and
 * Open in rows, git actions, and the panel toggle. Project scripts run from the terminal dock.
 */
export function ConductorTopBarActions(props: ConductorTopBarActionsProps) {
  const project = useProject(scopeProjectRef(props.environmentId, props.projectId));
  const serverConfig = useServerConfigs().get(props.environmentId);
  // A No project thread's folder sits inside the shared scratch root, so it must never get git.
  const offersGit =
    props.gitCwd !== null &&
    serverConfig !== undefined &&
    project !== null &&
    !isScratchProject(project, serverConfig.scratchWorkspaceRoot);

  return (
    <div className="ml-2 flex shrink-0 items-center gap-1.5 [-webkit-app-region:no-drag]">
      {props.isServerThread && !props.draftId ? (
        // Keyed by thread, so opening a related thread from the popover closes it.
        <SubagentsButton
          key={`${props.environmentId}:${props.threadId}`}
          environmentId={props.environmentId}
          threadId={props.threadId}
        />
      ) : null}
      <MoreMenu>
        <BranchToolbar
          layout="panel"
          panelSection="workspace"
          environmentId={props.environmentId}
          threadId={props.threadId}
          projectId={props.projectId}
          worktreePath={props.worktreePath}
          isServerThread={props.isServerThread}
          {...(props.draftId ? { draftId: props.draftId } : {})}
          showGitControls={props.isGitRepo}
          forceNewWorktree={props.forceNewWorktree}
          envLocked={props.envLocked}
          envMode={props.envMode}
          onEnvModeChange={props.onEnvModeChange}
          startFromOrigin={props.startFromOrigin}
          onStartFromOriginChange={props.onStartFromOriginChange}
          availableEnvironments={props.availableEnvironments}
          autoEnvironmentLabel={props.autoEnvironmentLabel}
          onAutoEnvironment={props.onAutoEnvironment}
          {...(props.onEnvironmentChange ? { onEnvironmentChange: props.onEnvironmentChange } : {})}
        />
        {props.showOpenInPicker ? (
          <OpenInPicker
            displayMode="panel"
            keybindings={props.keybindings}
            environmentId={props.environmentId}
            availableEditors={props.availableEditors}
            openInCwd={props.gitCwd}
            enableShortcut={props.openInShortcutEnabled}
          />
        ) : null}
      </MoreMenu>
      {offersGit ? (
        <GitActionsControl
          displayMode="titlebar"
          showChanges={false}
          gitCwd={props.gitCwd}
          workspaceMutationId={props.workspaceMutationId}
          activeThreadRef={{ environmentId: props.environmentId, threadId: props.threadId }}
          {...(props.draftId ? { draftId: props.draftId } : {})}
        />
      ) : null}
      {props.children}
    </div>
  );
}

/** The environment and Open in rows, behind one icon so the bar stays quiet. */
function MoreMenu({ children }: { children: ReactNode }) {
  const gt = useGT();
  const label = gt("More", { $context: "chat top bar menu: environment and open in editor" });
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-compact"
                  aria-label={label}
                  data-toolbar-control=""
                />
              }
            />
          }
        >
          <EllipsisIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipPopup side="bottom">{label}</TooltipPopup>
      </Tooltip>
      <PopoverPopup align="end" width="md" padding="none">
        <div className="flex flex-col p-1">{children}</div>
      </PopoverPopup>
    </Popover>
  );
}

/** Hidden until the thread has lineage, since the panel renders nothing without it. */
function SubagentsButton(props: { environmentId: EnvironmentId; threadId: ThreadId }) {
  return (
    <ThreadRelationshipsPanel
      environmentId={props.environmentId}
      threadId={props.threadId}
      showLineage
      showSideChats
      renderFrame={(panel, { runningCount }) => (
        <SubagentsPopover runningCount={runningCount}>{panel}</SubagentsPopover>
      )}
    />
  );
}

function SubagentsPopover({
  runningCount,
  children,
}: {
  runningCount: number;
  children: ReactNode;
}) {
  const gt = useGT();
  const label =
    runningCount > 0
      ? gt("Lineage · {runningCount} running", { runningCount })
      : gt("Lineage", { $context: "thread details section: parent and child agents" });
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size={runningCount > 0 ? "compact" : "icon-compact"}
                  aria-label={label}
                  data-toolbar-control=""
                />
              }
            />
          }
        >
          <BotIcon aria-hidden="true" />
          {runningCount > 0 ? <span className="tabular-nums">{runningCount}</span> : null}
        </TooltipTrigger>
        <TooltipPopup side="bottom">{label}</TooltipPopup>
      </Tooltip>
      <PopoverPopup align="end" width="md" padding="none">
        {children}
      </PopoverPopup>
    </Popover>
  );
}

/** The right panel toggle for the chat top bar. The terminal opens from its dock in the right panel. */
export function ConductorPanelControls(props: PanelLayoutControlsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1" data-workspace-titlebar-controls>
      <PanelLayoutControls {...props} showThreadPanelControl={false} showTerminalControl={false} />
    </div>
  );
}
