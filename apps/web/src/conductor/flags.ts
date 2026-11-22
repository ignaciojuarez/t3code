/** Upstream behaviors the Conductor fork turns off. Typed as boolean so call sites stay type-checked. */
export const conductorFlags: Readonly<{
  previewMiniPlayer: boolean;
  sidebarModelIcon: boolean;
  threadDetailsPanel: boolean;
  /** Upstream's terminal drawer under the chat; the fork docks terminals in the right panel instead. */
  centerTerminalDrawer: boolean;
  /** Upstream's search + icon buttons sidebar header; the fork shows Create and Search rows. */
  upstreamSidebarHeader: boolean;
}> = {
  previewMiniPlayer: false,
  sidebarModelIcon: false,
  threadDetailsPanel: false,
  centerTerminalDrawer: false,
  upstreamSidebarHeader: false,
};
