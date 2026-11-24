import type { ProjectId, PullRequestState, RepositoryIdentity } from "@t3tools/contracts";

import type { PullRequestChecksState } from "~/components/pullRequest/pullRequestDetail.logic";

type PrStripStatus =
  | "uncommitted"
  | "ahead"
  | "ready"
  | "draft"
  | "conflicts"
  | "checks-failing"
  | "checks-pending"
  | "open"
  | "merged"
  | "closed";

export function resolvePrStripStatus(input: {
  readonly state: PullRequestState;
  readonly isDraft: boolean;
  readonly hasWorkingTreeChanges: boolean;
  /** Local commits on the pull request's branch that are not pushed yet. */
  readonly aheadCount: number;
  readonly conflicting: boolean;
  readonly checks: PullRequestChecksState;
  readonly mergeable: boolean;
}): PrStripStatus {
  if (input.state !== "open") return input.state;
  if (input.hasWorkingTreeChanges) return "uncommitted";
  if (input.aheadCount > 0) return "ahead";
  if (input.isDraft) return "draft";
  if (input.conflicting) return "conflicts";
  if (input.mergeable) return "ready";
  if (input.checks === "failing") return "checks-failing";
  if (input.checks === "pending") return "checks-pending";
  return "open";
}

/**
 * A strip target from the checkout's git status: the open pull request for the current branch,
 * when the project's repository names its owner and name.
 */
export function branchStatusPrTarget(
  projectId: ProjectId,
  repository: RepositoryIdentity | undefined | null,
  pr: { readonly number: number; readonly url: string; readonly state: string } | null,
): { projectId: ProjectId; repository: string; number: number; url: string } | null {
  if (pr === null || pr.state !== "open" || !repository?.owner || !repository.name) return null;
  return {
    projectId,
    repository: `${repository.owner}/${repository.name}`,
    number: pr.number,
    url: pr.url,
  };
}
