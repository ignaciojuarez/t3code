/**
 * The chat header as the Conductor top bar: a divider below it, and a size container so its
 * controls drop their labels as the chat column narrows. The toolbar background comes from the
 * themed `[data-chat-header]` rule in index.css.
 */
export const TOPBAR_HEADER_CLASS = "@container/chat-topbar border-b border-border";

export const TOPBAR_LABEL_CLASS = "hidden min-w-0 max-w-40 truncate @2xl/chat-topbar:block";

/** The Open-in folder name is the widest label, so it drops first. */
export const TOPBAR_PATH_LABEL_CLASS = "hidden min-w-0 max-w-40 truncate @3xl/chat-topbar:block";
