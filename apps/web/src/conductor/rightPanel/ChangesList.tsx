import type { FileDiffMetadata } from "@pierre/diffs";
import { useGT } from "gt-react";
import { ListIcon, SquareDotIcon, SquareMinusIcon, SquarePlusIcon } from "lucide-react";
import { useState } from "react";

import { formatCompactDiffCount } from "~/components/chat/DiffStatLabel";
import { Toggle } from "~/components/ui/toggle-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

import { changedFileRows, type ChangedFileStatus } from "./changesList.logic";
import "./rightPanel.css";

/**
 * Whether the Changes tab shows its file list or the diffs. Each new view key starts over: on the
 * list, or on the diffs when the selection already points at them (a revealed file, a tool call).
 */
export function useChangesListView(viewKey: string, diffsFirst: boolean) {
  const [choice, setChoice] = useState<{ key: string; shown: boolean } | null>(null);
  return {
    shown: choice?.key === viewKey ? choice.shown : !diffsFirst,
    setShown: (shown: boolean) => setChoice({ key: viewKey, shown }),
  };
}

const STATUS_ICONS = {
  added: SquarePlusIcon,
  modified: SquareDotIcon,
  deleted: SquareMinusIcon,
} as const;

function ChangedFileStatusIcon({ status }: { status: ChangedFileStatus }) {
  const gt = useGT();
  const Icon = STATUS_ICONS[status];
  const label =
    status === "added" ? gt("Added") : status === "deleted" ? gt("Deleted") : gt("Modified");
  return (
    <Icon
      role="img"
      aria-label={label}
      data-conductor-file-status={status}
      className="size-3.5 shrink-0"
    />
  );
}

export function ChangesList({
  files,
  stats,
  onSelect,
}: {
  files: ReadonlyArray<FileDiffMetadata>;
  stats: ReadonlyMap<string, { readonly additions: number; readonly deletions: number }>;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-background px-1.5 py-1">
      {changedFileRows(files, stats).map((row) => (
        <Tooltip key={row.path}>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left font-sans text-sm outline-none [content-visibility:auto] [contain-intrinsic-size:auto_2rem] hover:bg-accent/60 focus-visible:bg-accent/60"
                onClick={() => onSelect(row.path)}
              />
            }
          >
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
              {row.directory ? (
                <span className="min-w-0 truncate text-muted-foreground">{row.directory}</span>
              ) : null}
              <span className="max-w-full shrink-0 truncate text-foreground">{row.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums">
              {row.additions > 0 ? (
                <span className="text-diff-addition-foreground">
                  +{formatCompactDiffCount(row.additions)}
                </span>
              ) : null}
              {row.deletions > 0 ? (
                <span className="text-diff-deletion-foreground">
                  -{formatCompactDiffCount(row.deletions)}
                </span>
              ) : null}
            </span>
            <ChangedFileStatusIcon status={row.status} />
          </TooltipTrigger>
          <TooltipPopup side="left">{row.path}</TooltipPopup>
        </Tooltip>
      ))}
    </div>
  );
}

export function ChangesListToggle({
  shown,
  onShownChange,
}: {
  shown: boolean;
  onShownChange: (shown: boolean) => void;
}) {
  const gt = useGT();
  const label = shown ? gt("Show diffs") : gt("Show changed files");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            aria-label={label}
            variant="ghost"
            size="sm"
            pressed={shown}
            onPressedChange={(pressed) => onShownChange(Boolean(pressed))}
          />
        }
      >
        <ListIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipPopup side="top">{label}</TooltipPopup>
    </Tooltip>
  );
}
