/** Upstream behaviors the Conductor fork turns off. Typed as boolean so call sites stay type-checked. */
export const conductorFlags: Readonly<{
  previewMiniPlayer: boolean;
  threadDetailsPanel: boolean;
  /** Upstream's terminal drawer under the chat; the fork docks terminals in the right panel instead. */
  centerTerminalDrawer: boolean;
}> = {
  previewMiniPlayer: false,
  threadDetailsPanel: false,
  centerTerminalDrawer: false,
};
