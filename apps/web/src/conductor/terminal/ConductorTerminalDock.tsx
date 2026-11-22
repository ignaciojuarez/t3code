import { useGT } from "gt-react";
import { ChevronDownIcon } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef, useState } from "react";

import { cn } from "~/lib/utils";

const MIN_DOCK_HEIGHT = 120;
const MIN_SURFACE_HEIGHT = 160;

interface ConductorTerminalDockProps {
  readonly expanded: boolean;
  readonly height: number;
  readonly onToggle: () => void;
  readonly onHeightChange: (height: number) => void;
  /** Trailing header controls, e.g. the project script Run button. */
  readonly actions?: ReactNode;
  /** The thread's terminal drawers, rendered in dock placement. */
  readonly children: ReactNode;
}

/** Conductor's bottom terminal section of the right panel: a header that collapses and a resizable body. */
export function ConductorTerminalDock({
  expanded,
  height,
  onToggle,
  onHeightChange,
  actions,
  children,
}: ConductorTerminalDockProps) {
  const gt = useGT();
  const sectionRef = useRef<HTMLElement>(null);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const bodyHeight = dragHeight ?? height;

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const section = sectionRef.current;
    const panel = section?.parentElement;
    if (!section || !panel) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = bodyHeight;
    const maxHeight = Math.max(MIN_DOCK_HEIGHT, panel.clientHeight - MIN_SURFACE_HEIGHT);
    let latest = startHeight;
    const handleMove = (moveEvent: PointerEvent) => {
      latest = Math.round(
        Math.min(maxHeight, Math.max(MIN_DOCK_HEIGHT, startHeight + startY - moveEvent.clientY)),
      );
      setDragHeight(latest);
    };
    const handleEnd = () => {
      target.removeEventListener("pointermove", handleMove);
      target.removeEventListener("pointerup", handleEnd);
      target.removeEventListener("pointercancel", handleEnd);
      setDragHeight(null);
      if (latest !== startHeight) onHeightChange(latest);
    };
    target.addEventListener("pointermove", handleMove);
    target.addEventListener("pointerup", handleEnd);
    target.addEventListener("pointercancel", handleEnd);
  };

  return (
    <section
      ref={sectionRef}
      data-conductor-terminal-dock={expanded ? "expanded" : "collapsed"}
      className="relative flex shrink-0 flex-col border-t border-border bg-background"
    >
      {expanded ? (
        <div
          aria-hidden
          className="absolute inset-x-0 -top-1 z-20 h-2 cursor-row-resize touch-none"
          onPointerDown={handleResizeStart}
        />
      ) : null}
      <div className="flex h-9 shrink-0 items-center gap-1 px-2">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? gt("Hide terminal") : gt("Show terminal")}
          onClick={onToggle}
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <ChevronDownIcon
            aria-hidden
            className={cn("size-4 transition-transform", !expanded && "-rotate-90")}
          />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "relative inline-flex h-9 cursor-pointer items-center px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            expanded
              ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {gt("Terminal")}
        </button>
        <div className="ml-auto flex min-w-0 items-center gap-1">{actions}</div>
      </div>
      <div
        className={cn("min-h-0 overflow-hidden", expanded ? "flex flex-col" : "hidden")}
        style={expanded ? { height: bodyHeight } : undefined}
      >
        {children}
      </div>
    </section>
  );
}
