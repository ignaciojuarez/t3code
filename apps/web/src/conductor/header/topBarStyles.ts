/**
 * The chat header as the Conductor top bar: a divider below it, and a size container so its
 * controls drop their labels as the chat column narrows. The toolbar background comes from the
 * themed `[data-chat-header]` rule in index.css.
 */
export const TOPBAR_HEADER_CLASS = "@container/chat-topbar border-b border-border";

/** The top bar is icons only; labels stay for screen readers and tooltips carry them visually. */
export const TOPBAR_LABEL_CLASS = "sr-only";

export const TOPBAR_PATH_LABEL_CLASS = "sr-only";
