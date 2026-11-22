#!/usr/bin/env bash
# Rebase the `conductor` patch stack onto an upstream T3 Code release tag.
# Usage: scripts/conductor/upgrade.sh [vX.Y.Z]   (defaults to the newest stable upstream tag)
# On a rebase conflict it stops with the rebase in progress; resolve, `git rebase --continue`, rerun.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if ! git remote get-url upstream >/dev/null 2>&1; then
  git remote add upstream https://github.com/pingdotgg/t3code.git
fi

if [ -d "$(git rev-parse --git-path rebase-merge)" ] || [ -d "$(git rev-parse --git-path rebase-apply)" ]; then
  echo "A rebase is already in progress. Resolve it, run 'git rebase --continue', then rerun this script." >&2
  exit 2
fi

if [ "$(git branch --show-current)" != "conductor" ]; then
  echo "Switch to the 'conductor' branch first." >&2
  exit 2
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash first." >&2
  exit 2
fi

git fetch upstream --tags --filter=blob:none --quiet

stable_tags() { git tag -l 'v*' --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$'; }

current="$(scripts/conductor/base.sh)"
target="${1:-$(stable_tags | sed -n 1p)}"
target="v${target#v}"

if ! git rev-parse -q --verify "refs/tags/$target" >/dev/null; then
  echo "Unknown tag: $target" >&2
  exit 2
fi

if [ "$current" = "$target" ]; then
  echo "Already on $target."
  exit 0
fi

if [ "$(git tag -l --sort=-v:refname "$current" "$target" | sed -n 1p)" != "$target" ]; then
  echo "$target is older than the current base $current. Restore a backup branch instead of downgrading." >&2
  exit 2
fi

backup="conductor-backup/$current-$(date +%Y%m%d%H%M%S)"
git branch "$backup" HEAD
echo "Rebasing conductor from $current onto $target (backup branch: $backup)"

if ! git rebase --onto "$target" "$current" conductor; then
  echo
  echo "Conflicts while rebasing onto $target. Files:"
  git diff --name-only --diff-filter=U
  echo "Resolve them keeping upstream's behavior plus our Conductor changes, then: git rebase --continue"
  exit 1
fi

echo "conductor is now based on $target. Patch stack:"
git log --oneline "$target..conductor"
echo "Backup of the previous stack: $backup"
