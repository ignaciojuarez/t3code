import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { type EnvironmentId, ThreadId } from "@t3tools/contracts";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { selectThreadRightPanelState, useRightPanelStore } from "~/rightPanelStore";

const ref = scopeThreadRef("env-1" as EnvironmentId, ThreadId.make("thread-A"));

beforeEach(() => {
  useRightPanelStore.setState({
    byThreadKey: {},
    threadPanelVisibilityByThreadKey: {},
    userActionRevisionByThreadKey: {},
    closeRevisionByThreadKey: {},
  });
});

const panel = () => selectThreadRightPanelState(useRightPanelStore.getState().byThreadKey, ref);

async function reload() {
  const { storage, name } = useRightPanelStore.persist.getOptions();
  const persisted = await storage!.getItem(name!);
  useRightPanelStore.setState(useRightPanelStore.getInitialState());
  await storage!.setItem(name!, persisted!);
  await useRightPanelStore.persist.rehydrate();
}

describe("seedSurfaces", () => {
  it("opens a new thread on All files beside Changes without counting as a user choice", () => {
    useRightPanelStore.getState().seedSurfaces(ref, ["files", "diff"], "files");

    expect(panel()).toMatchObject({
      isOpen: true,
      activeSurfaceId: "files",
      surfaces: [
        { id: "files", kind: "files" },
        { id: "diff", kind: "diff" },
      ],
    });
    expect(useRightPanelStore.getState().getUserActionRevision(ref)).toBe(0);
  });

  it("keeps All files and Changes through every kind of close, and the panel open", () => {
    const store = useRightPanelStore.getState();
    store.seedSurfaces(ref, ["files", "diff"], "files");
    store.open(ref, "pull-requests");

    store.closeAllSurfaces(ref);
    expect(panel()).toMatchObject({
      isOpen: true,
      surfaces: [{ id: "files" }, { id: "diff" }],
    });

    store.closeSurface(ref, "diff");
    store.closeOtherSurfaces(ref, "files");
    expect(panel()?.surfaces.map((surface) => surface.id)).toEqual(["files", "diff"]);
  });

  it("brings them back, first and in order, when a saved panel lost them", async () => {
    const store = useRightPanelStore.getState();
    store.open(ref, "pull-requests");
    store.seedSurfaces(ref, ["files", "diff"], "files");
    store.moveSurface(ref, "files", 2);
    await reload();

    useRightPanelStore.getState().seedSurfaces(ref, ["files", "diff"], "files");

    expect(panel()?.surfaces.map((surface) => surface.id)).toEqual([
      "files",
      "diff",
      "pull-requests",
    ]);
  });

  it("adds the defaults ahead of a saved panel without reopening it", () => {
    const store = useRightPanelStore.getState();
    store.open(ref, "pull-requests");
    store.close(ref);

    store.seedSurfaces(ref, ["files", "diff"], "diff");

    expect(panel()).toMatchObject({
      isOpen: false,
      activeSurfaceId: "pull-requests",
      surfaces: [{ id: "files" }, { id: "diff" }, { id: "pull-requests" }],
    });
  });
});
