import { conductorFlags } from "../flags";

/** The right panel's permanent tabs, in order: All files, then Changes. */
const PINNED_SURFACE_IDS: ReadonlyArray<string> = ["files", "diff"];

interface PanelSurfaces<S extends { readonly id: string }> {
  readonly surfaces: ReadonlyArray<S>;
  readonly activeSurfaceId: string | null;
  readonly isOpen: boolean;
}

/** Puts the pinned surfaces a thread has first, All files before Changes, others after. */
export function pinnedSurfacesFirst<S extends { readonly id: string }>(
  surfaces: ReadonlyArray<S>,
): S[] {
  const pinned = PINNED_SURFACE_IDS.flatMap((id) =>
    surfaces.filter((surface) => surface.id === id),
  );
  return [...pinned, ...surfaces.filter((surface) => !PINNED_SURFACE_IDS.includes(surface.id))];
}

/**
 * Closing tabs never removes All files or Changes: whichever of them the thread had before stay,
 * first and in order, and the panel stays open while they do.
 */
export function keepPinnedSurfaces<T extends PanelSurfaces<S>, S extends { readonly id: string }>(
  before: T,
  after: T,
): T {
  if (conductorFlags.closablePanelTabs) return after;
  const pinned = before.surfaces.filter((surface) => PINNED_SURFACE_IDS.includes(surface.id));
  if (pinned.length === 0) return after;
  const surfaces = pinnedSurfacesFirst([
    ...pinned.filter((surface) => !after.surfaces.some((entry) => entry.id === surface.id)),
    ...after.surfaces,
  ]);
  const activeSurfaceId = surfaces.some((surface) => surface.id === after.activeSurfaceId)
    ? after.activeSurfaceId
    : (pinned[0]?.id ?? null);
  return { ...after, surfaces, activeSurfaceId, isOpen: before.isOpen };
}
