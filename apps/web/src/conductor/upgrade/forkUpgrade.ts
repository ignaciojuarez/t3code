import type { DesktopUpdateState } from "@t3tools/contracts";

import {
  getDesktopUpdateDownloadedVersion,
  resolveDesktopUpdateButtonAction,
} from "../../components/desktopUpdate.logic";

const DEFAULT_CONDUCTOR_FORK_ROOT = "/Users/ignacio/Developer/t3code-conductor";
const configuredForkRoot: unknown = import.meta.env.VITE_CONDUCTOR_FORK_ROOT;

/** The fork's checkout on this machine. scripts/conductor/build.sh bakes it into the bundle. */
export const CONDUCTOR_FORK_ROOT =
  typeof configuredForkRoot === "string" && configuredForkRoot.trim().length > 0
    ? configuredForkRoot.trim()
    : DEFAULT_CONDUCTOR_FORK_ROOT;

/** The upstream release this fork can rebase onto. The desktop app refuses to install it. */
export function conductorUpgradeVersion(state: DesktopUpdateState | null): string | null {
  return state !== null && resolveDesktopUpdateButtonAction(state) !== "none"
    ? getDesktopUpdateDownloadedVersion(state)
    : null;
}

export function conductorUpgradeThreadTitle(version: string): string {
  // oxlint-disable-next-line t3code/no-untranslated-copy -- the next click finds the running upgrade by this exact title
  return `Upgrade Conductor fork to v${version}`;
}

export function conductorUpgradePrompt(version: string): string {
  // oxlint-disable-next-line t3code/no-untranslated-copy -- instructions for the upgrade agent
  return `Upgrade this Conductor fork of T3 Code to upstream v${version}. Follow .agents/skills/conductor-upgrade/SKILL.md step by step.`;
}
