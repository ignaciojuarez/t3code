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
  it("opens a new thread on Changes beside All files without counting as a user choice", () => {
    useRightPanelStore.getState().seedSurfaces(ref, ["files", "diff"], "diff");

    expect(panel()).toMatchObject({
      isOpen: true,
      activeSurfaceId: "diff",
      surfaces: [
        { id: "files", kind: "files" },
        { id: "diff", kind: "diff" },
      ],
    });
    expect(useRightPanelStore.getState().getUserActionRevision(ref)).toBe(0);
  });

  it("does not bring back tabs the user closed, even after a reload", async () => {
    const store = useRightPanelStore.getState();
    store.seedSurfaces(ref, ["files", "diff"], "diff");
    store.closeAllSurfaces(ref);
    await reload();

    useRightPanelStore.getState().seedSurfaces(ref, ["files", "diff"], "diff");

    expect(panel()).toMatchObject({ isOpen: false, surfaces: [] });
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
