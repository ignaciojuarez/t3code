import type { ReactNode } from "react";
import { PrStatusStrip, useThreadPrStripTarget } from "~/conductor/rightPanel/PrStatusStrip";
import { usePreviewPanelInlineSize } from "../../hooks/usePreviewPanelInlineSize";
import { RightPanelSheet } from "../RightPanelSheet";
import { RightPanelTabs, type RightPanelTabsProps } from "../RightPanelTabs";

type ChatRightPanelProps = Omit<RightPanelTabsProps, "mode" | "inlineSize" | "maximized"> & {
  readonly sheet: boolean;
  readonly maximized: boolean;
  readonly workspaceLayoutElement: HTMLElement | null;
  readonly widthStorageKey: string;
  readonly sheetAnimationDurationMs: number;
  readonly onCloseSheet: () => void;
  /** The Conductor terminal dock, pinned to the bottom of the panel. */
  readonly bottomDock?: ReactNode;
};

/**
 * The right panel, inline beside the chat column or as a sheet on narrow
 * layouts. Its width follows a resize drag every frame, so the width state
 * lives here rather than in ChatView.
 */
export function ChatRightPanel(props: ChatRightPanelProps) {
  const {
    sheet,
    workspaceLayoutElement,
    widthStorageKey,
    sheetAnimationDurationMs,
    onCloseSheet,
    maximized,
    layoutControls,
    bottomDock,
    ...tabs
  } = props;
  const inlineSize = usePreviewPanelInlineSize({
    container: workspaceLayoutElement,
    widthStorageKey,
  });
  const prStripTarget = useThreadPrStripTarget();
  const header = prStripTarget ? (
    <PrStatusStrip {...prStripTarget} inline={!sheet} maximized={maximized} />
  ) : undefined;
  if (!sheet) {
    return (
      <RightPanelTabs
        {...tabs}
        mode="inline"
        maximized={maximized}
        inlineSize={inlineSize}
        header={header}
        reserveTitlebarControls={false}
        layoutControls={maximized ? layoutControls : undefined}
        footer={bottomDock}
      />
    );
  }
  return (
    <RightPanelSheet
      animationDurationMs={sheetAnimationDurationMs}
      open={tabs.open === true}
      onClose={onCloseSheet}
    >
      <RightPanelTabs
        {...tabs}
        mode="sheet"
        inlineSize={inlineSize}
        layoutControls={layoutControls}
        header={header}
        footer={bottomDock}
      />
    </RightPanelSheet>
  );
}
