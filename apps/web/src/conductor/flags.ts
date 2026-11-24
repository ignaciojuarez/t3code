/** Upstream behaviors the Conductor fork turns off. Typed as boolean so call sites stay type-checked. */
export const conductorFlags: Readonly<{
  previewMiniPlayer: boolean;
  threadDetailsPanel: boolean;
  /** Upstream's terminal drawer under the chat; the fork docks terminals in the right panel instead. */
  centerTerminalDrawer: boolean;
  /** All files' search row; the fork shows it only while searching, opened by the find command. */
  filesSearchRow: boolean;
  /** The thread pull request view's repository row and merge button; the PR strip covers both. */
  prPanelHeaderRow: boolean;
  /** Sidebar rows' third line: branch, worktree, PR and diff badges, computer and model icons. */
  sidebarMetaLine: boolean;
  /** The sidebar's Add project icon; the fork offers it inside the new thread picker instead. */
  sidebarAddProjectButton: boolean;
  /** The composer's record audio button; dictation stays on its shortcut. */
  composerMicButton: boolean;
  /** Closing the right panel's All files and Changes tabs; the fork keeps them, first. */
  closablePanelTabs: boolean;
}> = {
  previewMiniPlayer: false,
  threadDetailsPanel: false,
  centerTerminalDrawer: false,
  filesSearchRow: false,
  prPanelHeaderRow: false,
  sidebarMetaLine: false,
  sidebarAddProjectButton: false,
  composerMicButton: false,
  closablePanelTabs: false,
};
