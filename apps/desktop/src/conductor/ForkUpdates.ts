import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as DesktopObservability from "../app/DesktopObservability.ts";
import * as DesktopUpdates from "../updates/DesktopUpdates.ts";

const { logWarning } = DesktopObservability.makeComponentLogger("conductor-fork");

export const UPSTREAM_INSTALL_REFUSAL =
  "This Conductor fork never installs upstream T3 Code builds. Use Upgrade fork in the app to rebase and rebuild it instead.";

type DesktopUpdatesService = DesktopUpdates.DesktopUpdates["Service"];

const guardedServices = new WeakSet<DesktopUpdatesService>();

/** Upstream tests build the unguarded service, so only the app's own layer refuses. */
export function refusesUpstreamInstalls(updates: DesktopUpdatesService): boolean {
  return guardedServices.has(updates);
}

/** Checks still find upstream releases; downloading or installing one would replace the fork. */
export function refuseUpstreamInstalls(updates: DesktopUpdatesService): DesktopUpdatesService {
  const refuse = Effect.fn("ConductorForkUpdates.refuse")(function* (
    action: "download" | "install",
  ) {
    const state = yield* updates.getState;
    yield* logWarning(`refused upstream ${action}. ${UPSTREAM_INSTALL_REFUSAL}`, {
      action,
      availableVersion: state.availableVersion,
      currentVersion: state.currentVersion,
    });
    return { accepted: false, completed: false, state };
  });
  const guarded: DesktopUpdatesService = {
    ...updates,
    download: refuse("download"),
    install: refuse("install"),
    installPrepared: () =>
      refuse("install").pipe(Effect.map((result) => ({ ...result, failed: false }))),
  };
  guardedServices.add(guarded);
  return guarded;
}

export const layer = Layer.effect(
  DesktopUpdates.DesktopUpdates,
  DesktopUpdates.make.pipe(Effect.map(refuseUpstreamInstalls)),
);
