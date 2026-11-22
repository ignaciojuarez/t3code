import type { ComponentProps } from "react";

import { ThreadDetailsPanel as UpstreamThreadDetailsPanel } from "~/components/chat/ThreadDetailsPanel";

import { conductorFlags } from "../flags";

/** The fork moves the thread details card's rows into the chat top bar. */
export function ThreadDetailsPanel(props: ComponentProps<typeof UpstreamThreadDetailsPanel>) {
  return conductorFlags.threadDetailsPanel ? <UpstreamThreadDetailsPanel {...props} /> : null;
}
