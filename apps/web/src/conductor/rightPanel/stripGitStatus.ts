import * as Equal from "effect/Equal";
import { AsyncResult, Atom } from "effect/reactivity";

import type { vcsEnvironment } from "~/state/vcs";

/** What the PR strip reads from a checkout's status: the chat fields plus how far ahead it is. */
export const stripGitStatusAtom = Atom.family((status: ReturnType<typeof vcsEnvironment.status>) =>
  Atom.map(status, (result) => {
    const data = AsyncResult.getOrElse(result, () => null);
    if (data === null) return null;
    const { refName, hasWorkingTreeChanges, hasUpstream, aheadCount } = data;
    return { refName, hasWorkingTreeChanges, hasUpstream, aheadCount };
  }).pipe(Atom.withEquality(Equal.equals)),
);

export const NO_STRIP_GIT_STATUS_ATOM: ReturnType<typeof stripGitStatusAtom> = Atom.make(null);
