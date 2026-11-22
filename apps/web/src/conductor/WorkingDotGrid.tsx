import { cn } from "~/lib/utils";

// Clockwise around the 3x3 grid; the centre dot stays dim.
const RING: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
  [1, 2],
  [0, 2],
  [0, 1],
];
const CELL = [0.6, 3.8, 7] as const;

/** Conductor's "working" indicator: a 3x3 dot grid with a light running around the edge. */
export function WorkingDotGrid({
  className,
}: {
  className?: string | undefined;
  "aria-hidden"?: boolean | undefined;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 10"
      data-conductor-working-grid
      className={cn("size-2.5 shrink-0", className)}
      fill="currentColor"
    >
      {RING.map(([column, row], index) => (
        <rect
          key={`${column}-${row}`}
          x={CELL[column]}
          y={CELL[row]}
          width="2.4"
          height="2.4"
          rx="0.5"
          style={{ animationDelay: `${index * 0.125 - 1}s` }}
        />
      ))}
      <rect data-center x={CELL[1]} y={CELL[1]} width="2.4" height="2.4" rx="0.5" />
    </svg>
  );
}
