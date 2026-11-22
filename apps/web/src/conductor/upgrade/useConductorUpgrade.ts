import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import { thrownErrorMessage } from "@t3tools/client-runtime/errors";
import {
  findProjectByPath,
  inferProjectTitleFromPath,
} from "@t3tools/client-runtime/state/projects";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type {
  DesktopUpdateState,
  EnvironmentId,
  ScopedProjectRef,
  ThreadId,
} from "@t3tools/contracts";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import { resolveNewThreadModelSelection } from "@t3tools/shared/usageLimits";
import { useNavigate } from "@tanstack/react-router";
import { useGT } from "gt-react";

import { stackedThreadToast, toastManager } from "../../components/ui/toast";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { m } from "../../i18n/messages";
import { newMessageId, newProjectId, newThreadId } from "../../lib/utils";
import { resolveProjectDefaultProviderModelSelection } from "../../providerInstances";
import { appAtomRegistry } from "../../rpc/atomRegistry";
import { readProject, readProjects, readThreadShells, waitForProject } from "../../state/entities";
import { readEnvironment, readEnvironmentProviders } from "../../state/environments";
import { localEnvironmentIdAtom } from "../../state/primaryEnvironment";
import { projectEnvironment } from "../../state/projects";
import { environmentShell } from "../../state/shell";
import { threadEnvironment } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";
import { useOrchestrationCommand } from "../../state/use-orchestration-command";
import { buildThreadRouteParams } from "../../threadRoutes";
import {
  CONDUCTOR_FORK_ROOT,
  conductorUpgradePrompt,
  conductorUpgradeThreadTitle,
  conductorUpgradeVersion,
} from "./forkUpgrade";

function useUpgradeCommands() {
  return {
    gt: useGT(),
    navigate: useNavigate(),
    openDraft: useNewThreadHandler(),
    createProject: useAtomCommand(projectEnvironment.create, { reportFailure: false }),
    startTurn: useOrchestrationCommand(threadEnvironment.startTurn, { reportFailure: false }),
  };
}

type UpgradeCommands = ReturnType<typeof useUpgradeCommands>;

async function findOrCreateForkProject(
  { createProject }: UpgradeCommands,
  environmentId: EnvironmentId,
) {
  const existing = findProjectByPath(
    readProjects().filter((project) => project.environmentId === environmentId),
    CONDUCTOR_FORK_ROOT,
  );
  if (existing) return scopeProjectRef(environmentId, existing.id);
  const projectRef = scopeProjectRef(environmentId, newProjectId());
  const created = await createProject({
    environmentId,
    input: {
      projectId: projectRef.projectId,
      title: inferProjectTitleFromPath(CONDUCTOR_FORK_ROOT),
      workspaceRoot: CONDUCTOR_FORK_ROOT,
      createWorkspaceRootIfMissing: false,
      defaultModelSelection: null,
    },
  });
  if (created._tag === "Failure") throw squashAtomCommandFailure(created);
  await waitForProject(projectRef);
  return projectRef;
}

function resolveLaunchDefaults(projectRef: ScopedProjectRef) {
  const settings = readEnvironment(projectRef.environmentId)?.serverConfig?.settings;
  if (!settings) return null;
  const providers = readEnvironmentProviders(projectRef.environmentId) ?? [];
  const projectSettings = resolveProjectSettings(
    settings,
    projectRef.projectId,
    readProject(projectRef) ?? undefined,
  ).settings;
  const { selection } = resolveNewThreadModelSelection({
    defaultSelection:
      projectSettings.defaultModelSelection ??
      resolveProjectDefaultProviderModelSelection(providers, settings, projectRef.projectId),
    fallbackSelection: settings.fallbackModelSelection ?? null,
    providers,
    settings,
    projectId: projectRef.projectId,
    now: Date.now(),
  });
  return selection
    ? { modelSelection: selection, runtimeMode: projectSettings.defaultRuntimeMode }
    : null;
}

async function launchUpgradeThread(commands: UpgradeCommands, version: string) {
  const { gt, navigate, startTurn } = commands;
  const openThread = (environmentId: EnvironmentId, threadId: ThreadId) =>
    navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(environmentId, threadId)),
    });
  const title = conductorUpgradeThreadTitle(version);
  const prompt = conductorUpgradePrompt(version);
  let projectRef: ScopedProjectRef | null = null;
  try {
    const environmentId = appAtomRegistry.get(localEnvironmentIdAtom);
    const environment = environmentId === null ? null : readEnvironment(environmentId);
    // Before the shell snapshot loads, the fork's project would look missing and be added twice.
    if (
      environmentId === null ||
      environment?.connection.phase !== "connected" ||
      !appAtomRegistry.get(environmentShell.hasSnapshotAtom(environmentId))
    ) {
      throw new Error(gt("This computer's T3 Code server is not connected yet."));
    }
    projectRef = await findOrCreateForkProject(commands, environmentId);
    const { projectId } = projectRef;
    // Two agents rebasing one checkout would collide, so a second click reopens the first thread.
    const running = readThreadShells().find(
      (thread) =>
        thread.environmentId === environmentId &&
        thread.projectId === projectId &&
        thread.title === title &&
        thread.archivedAt === null,
    );
    if (running) {
      await openThread(environmentId, running.id);
      return;
    }
    const defaults = resolveLaunchDefaults(projectRef);
    if (defaults === null) {
      throw new Error(gt("No model is available to run the fork upgrade."));
    }
    const threadId = newThreadId();
    const createdAt = new Date().toISOString();
    const result = await startTurn({
      environmentId,
      input: {
        threadId,
        message: { messageId: newMessageId(), role: "user", text: prompt, attachments: [] },
        ...defaults,
        interactionMode: "default",
        bootstrap: {
          createThread: {
            projectId,
            title,
            ...defaults,
            interactionMode: "default",
            branch: null,
            worktreePath: null,
            createdAt,
          },
        },
        createdAt,
      },
    });
    if (result._tag === "Failure") throw squashAtomCommandFailure(result);
    await openThread(environmentId, threadId);
  } catch (error) {
    toastManager.add(
      stackedThreadToast({
        type: "error",
        title: gt("Could not start the fork upgrade"),
        description: thrownErrorMessage(error, m) ?? gt("An unexpected error occurred."),
      }),
    );
    if (projectRef !== null) await commands.openDraft(projectRef, { prompt }).catch(() => null);
  }
}

/**
 * When upstream publishes a newer release, offers a thread in the fork's own project whose agent
 * rebases, rebuilds and reinstalls the fork. Null while there is nothing to upgrade to.
 */
export function useConductorUpgrade(state: DesktopUpdateState | null) {
  const commands = useUpgradeCommands();
  const version = conductorUpgradeVersion(state);
  if (version === null) return null;
  return {
    version,
    label: commands.gt("Upgrade fork to v{version}", { version }),
    actionLabel: commands.gt("Upgrade fork"),
    start: () => launchUpgradeThread(commands, version),
  };
}
