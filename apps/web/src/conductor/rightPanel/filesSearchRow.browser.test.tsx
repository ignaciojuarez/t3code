import { EnvironmentId, type ProjectEntry } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { isMacPlatform } from "~/lib/utils";
import { render } from "../../../test/render";
import FileBrowserPanel from "~/components/files/FileBrowserPanel";
import { dispatchPreviewAction } from "~/components/preview/previewActionBus";

const entries: readonly ProjectEntry[] = [
  { path: "src", kind: "directory" },
  { path: "README.md", kind: "file" },
];
const loadingDirectories: ReadonlySet<string> = new Set();
const directory: {
  entries: readonly ProjectEntry[];
  load: () => Promise<void>;
  refresh: () => void;
  ready: boolean;
  error: null;
  isPending: boolean;
  loadingDirectories: ReadonlySet<string>;
} = {
  entries,
  load: () => Promise.resolve(),
  refresh: () => {},
  ready: true,
  error: null,
  isPending: false,
  loadingDirectories,
};
const pathSearch = {
  entries: [],
  isPending: false,
  error: null,
  truncated: false,
  refresh: () => {},
};

vi.mock("~/components/files/useDirectoryEntries", () => ({ useDirectoryEntries: () => directory }));
vi.mock("~/state/queries", () => ({ useProjectPathSearch: () => pathSearch }));
vi.mock("~/fileContextMenu", () => ({
  useFileContextMenu: () => ({ buildItems: () => [], activate: () => Promise.resolve() }),
}));
vi.mock("~/hooks/useWorkspaceMutationRefresh", () => ({ useWorkspaceMutationRefresh: () => {} }));

function findTreeRow(path: string): HTMLElement | null {
  for (const host of document.querySelectorAll("*")) {
    const row = host.shadowRoot?.querySelector<HTMLElement>(`[data-item-path="${path}"]`);
    if (row) return row;
  }
  return null;
}

it("hides the files search row until the find command opens it, and Escape hides it again", async () => {
  await using _screen = await render(
    <FileBrowserPanel
      environmentId={EnvironmentId.make("env-files")}
      cwd="/repo"
      projectName="repo"
      selectedPath={null}
      selectedPathRevealId={0}
      onOpenFile={() => {}}
      workspaceMutationId={null}
      answersPanelFind
    />,
  );
  await vi.waitFor(() => expect(findTreeRow("README.md")).not.toBeNull());
  const search = page.getByRole("searchbox", { name: "Search repo files" });
  await expect.element(search).not.toBeInTheDocument();

  dispatchPreviewAction("find");
  await expect.element(search).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await expect.element(search).not.toBeInTheDocument();

  findTreeRow("README.md")!.focus();
  const modifier = isMacPlatform(navigator.platform) ? "Meta" : "Control";
  await userEvent.keyboard(`{${modifier}>}f{/${modifier}}`);
  await expect.element(search).toHaveFocus();
  await userEvent.fill(search, "read");
  (search.element() as HTMLElement).blur();
  // A query keeps the row open after focus leaves.
  await expect.element(search).toHaveValue("read");
});
