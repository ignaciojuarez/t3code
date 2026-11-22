import type { FileTreeIcons } from "@pierre/trees";

import { T3_PIERRE_ICONS } from "~/pierre-icons";
import { PIERRE_TREE_UNSAFE_CSS } from "~/pierre-tree-theme";

// Lucide Folder Closed and File icons, ISC license.
const CONDUCTOR_TREE_SYMBOLS = `
  <symbol id="conductor-tree-folder" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M2 10h20" />
    </g>
  </symbol>
  <symbol id="conductor-tree-file" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    </g>
  </symbol>
`;

const t3Sprite = T3_PIERRE_ICONS.spriteSheet;
const spriteEnd = t3Sprite.lastIndexOf("</svg>");

/** Monochrome outline icons: a folder in place of the directory chevron, one icon for every file. */
export const CONDUCTOR_TREE_ICONS = {
  set: "none",
  colored: false,
  // Pierre reads only the first <svg>, so these join T3's sheet, which has the loading spinner.
  spriteSheet: `${t3Sprite.slice(0, spriteEnd)}${CONDUCTOR_TREE_SYMBOLS}${t3Sprite.slice(spriteEnd)}`,
  remap: {
    "file-tree-icon-chevron": "conductor-tree-folder",
    "file-tree-icon-file": "conductor-tree-file",
  },
} satisfies FileTreeIcons;

// The folder keeps the chevron's slot name, so the slot's collapsed rotation is cancelled.
export const CONDUCTOR_TREE_UNSAFE_CSS = `${PIERRE_TREE_UNSAFE_CSS}
  :host {
    --trees-font-family-override: var(--font-mono);
    --trees-font-size-override: 13px;
  }
  [data-item-section='icon'] > [data-icon-name='file-tree-icon-chevron'] { transform: none !important; }
`;
