import { assert, describe, it } from "@effect/vitest";
import type {
  DesktopTelemetryRequestDesktopUpdate,
  DesktopUpdateStatusReport,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";

import * as DesktopTelemetryPublisher from "../telemetry/DesktopTelemetryPublisher.ts";
import * as DesktopRemoteUpdates from "../updates/DesktopRemoteUpdates.ts";
import * as DesktopUpdates from "../updates/DesktopUpdates.ts";
import { flushCallbacks, makeHarness } from "../updates/updatesTestHarness.ts";
import { refuseUpstreamInstalls, UPSTREAM_INSTALL_REFUSAL } from "./ForkUpdates.ts";

// Updater runPromise handlers need real microtasks between test-runtime fiber yields.
const settle = Effect.gen(function* () {
  for (let i = 0; i < 20; i += 1) {
    yield* Effect.yieldNow;
    yield* Effect.promise(() => Promise.resolve());
  }
});

const guardedUpdates = DesktopUpdates.DesktopUpdates.pipe(Effect.map(refuseUpstreamInstalls));

describe("ConductorForkUpdates", () => {
  it.effect("finds upstream releases but never downloads or installs them", () => {
    const harness = makeHarness({
      checkForUpdates: Effect.sync(() => harness.emit("update-available", { version: "1.2.4" })),
    });

    return Effect.scoped(
      Effect.gen(function* () {
        const updates = yield* guardedUpdates;
        yield* updates.configure;
        yield* updates.check("poll");
        yield* flushCallbacks;
        assert.equal((yield* updates.getState).availableVersion, "1.2.4");

        assert.isFalse((yield* updates.download).accepted);
        assert.isFalse((yield* updates.install).accepted);
        assert.isFalse((yield* updates.installPrepared("1.2.4")).accepted);
        assert.equal(harness.downloadCount(), 0);
        assert.equal(harness.quitAndInstalls(), 0);
        assert.equal((yield* updates.getState).status, "available");
      }),
    ).pipe(Effect.provide(Layer.merge(TestClock.layer(), harness.layer)));
  });

  it.effect("fails a remote update request instead of retrying the refused download", () => {
    const harness = makeHarness();

    return Effect.scoped(
      Effect.gen(function* () {
        const requests = yield* Queue.unbounded<DesktopTelemetryRequestDesktopUpdate>();
        const reports: DesktopUpdateStatusReport[] = [];
        const publisher = DesktopTelemetryPublisher.DesktopTelemetryPublisher.of({
          latest: Effect.succeedNone,
          changes: Stream.empty,
          encoded: Stream.empty,
          handleControlForSource: () => Effect.void,
          removeControlSource: () => Effect.void,
          publishUpdateReport: (report) => Effect.sync(() => void reports.push(report)),
          updateRequests: Stream.fromQueue(requests),
          updateCommits: Stream.empty,
          updateCancellations: Stream.empty,
        });
        const updates = yield* guardedUpdates;
        yield* updates.configure;
        yield* DesktopRemoteUpdates.listen.pipe(
          Effect.provideService(DesktopTelemetryPublisher.DesktopTelemetryPublisher, publisher),
          Effect.provideService(DesktopUpdates.DesktopUpdates, updates),
        );
        yield* settle;

        yield* Queue.offer(requests, { version: 1, type: "requestDesktopUpdate", requestId: "r" });
        yield* settle;
        harness.emit("update-available", { version: "1.2.4" });
        yield* settle;

        const terminals = reports.filter((report) => report.outcome !== undefined);
        assert.deepEqual(
          terminals.map((report) => [report.requestId, report.outcome, report.reason]),
          [["r", "failed", UPSTREAM_INSTALL_REFUSAL]],
        );
        assert.equal(harness.downloadCount(), 0);
      }),
    ).pipe(Effect.provide(Layer.merge(TestClock.layer(), harness.layer)));
  });
});
