import type { PullRequestState } from "@t3tools/contracts";

import type { PullRequestChecksState } from "~/components/pullRequest/pullRequestDetail.logic";

type PrStripStatus =
  | "uncommitted"
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
  readonly conflicting: boolean;
  readonly checks: PullRequestChecksState;
  readonly mergeable: boolean;
}): PrStripStatus {
  if (input.state !== "open") return input.state;
  if (input.hasWorkingTreeChanges) return "uncommitted";
  if (input.isDraft) return "draft";
  if (input.conflicting) return "conflicts";
  if (input.mergeable) return "ready";
  if (input.checks === "failing") return "checks-failing";
  if (input.checks === "pending") return "checks-pending";
  return "open";
}
