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
}> = {
  previewMiniPlayer: false,
  threadDetailsPanel: false,
  centerTerminalDrawer: false,
  filesSearchRow: false,
  prPanelHeaderRow: false,
};
