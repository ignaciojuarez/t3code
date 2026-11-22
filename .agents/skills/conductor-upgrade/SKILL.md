---
name: conductor-upgrade
description: Upgrade the Conductor fork of T3 Code to a newer upstream stable release by rebasing the conductor patch stack, typechecking, building an unsigned macOS app, pushing, and installing it on the next quit once the user agrees. Use when an "Upgrade Conductor fork" thread starts, or when the user asks to upgrade, rebuild, reinstall, or roll back the fork.
---

# Upgrade the Conductor fork

The thread's first message names the upstream release, such as `v0.1.12`. That is the target tag.
Read [CONDUCTOR.md](../../../CONDUCTOR.md) first for how the fork is laid out.

You run inside the installed T3 Code app, which this procedure replaces. Never quit, kill, or
signal it, and never touch `/Applications` or `~/.t3` except through `scripts/conductor/install.sh`.
Never install an upstream T3 Code build, because it would replace the fork. Disk space is tight,
so keep one build at a time and do not copy app bundles around.

## 1. Check the starting point

Run these from the repository root, which is this thread's project.

```sh
git branch --show-current   # must print: conductor
git status --porcelain      # must print nothing
scripts/conductor/base.sh   # the upstream release the fork is on now
```

If the branch is wrong, the tree is dirty, or a rebase is already in progress, stop and show the
user what you found. Do not stash, reset, or discard anything without their say-so. If the fork is
already on the target tag, say so and ask whether they want a rebuild and reinstall. If they do,
skip to step 5.

## 2. Learn the patch stack

Know what the fork changes before you resolve conflicts in it:

```sh
git log --oneline $(scripts/conductor/base.sh)..conductor
git diff $(scripts/conductor/base.sh)...conductor --stat
```

Fork code lives in `apps/web/src/conductor/`, `apps/desktop/src/conductor/`,
`apps/web/src/conductor/conductorTheme.ts`, and `scripts/conductor/`. The web directory holds the
flags in `flags.ts` and the upgrade flow in `upgrade/`. Everything else in the stat is a small
hook-in to an upstream file.

## 3. Rebase onto the release

```sh
scripts/conductor/upgrade.sh v0.1.12
```

It fetches upstream tags, creates a `conductor-backup/<old-tag>-<timestamp>` branch, and rebases.
Note the backup branch name it prints. It exits 1 with a rebase in progress when there are
conflicts.

## 4. Resolve conflicts

For each file from `git diff --name-only --diff-filter=U`:

1. See what upstream changed: `git diff <old-tag> <new-tag> -- <file>`.
2. Keep upstream's new behavior and re-apply the fork's intent on top. In a rebase, "ours" is the
   upstream side and "theirs" is the fork commit being replayed. When a hook-in no longer fits,
   move the logic into the fork directories and keep the upstream edit to a line or two.
3. For `pnpm-lock.yaml`, take upstream's with `git checkout --ours pnpm-lock.yaml`, run
   `pnpm install --lockfile-only` to add the fork's dependencies back, then stage it.
4. `git add <file>`, then `GIT_EDITOR=true git rebase --continue`. Repeat until it finishes.

Skip a fork commit only when upstream already contains the same change, and tell the user. If the
rebase becomes a mess, `git rebase --abort` puts everything back as it was. Report and stop.

## 5. Install and typecheck

```sh
pnpm install --frozen-lockfile
```

If the lockfile is stale, run `pnpm install` and commit `pnpm-lock.yaml` as
`chore(conductor): refresh lockfile for <tag>`. Homebrew's pnpm adds an `@pnpm/exe` entry under
`packageManagerDependencies` even with `--frozen-lockfile`; when that is the only lockfile change,
discard it with `git checkout pnpm-lock.yaml`.

Typecheck the packages the fork touches, from each package directory:

```sh
(cd apps/web && pnpm exec vp run typecheck 2>&1 | grep -E ' - error ')
(cd apps/desktop && pnpm exec vp run typecheck 2>&1 | grep -E ' - error ')
(cd packages/shared && pnpm exec vp run typecheck 2>&1 | grep -E ' - error ')
(cd apps/desktop && pnpm exec vp test run src/conductor)
(cd apps/web && pnpm exec vp test run src/conductor)
```

No output from the grep means no errors. Fix what breaks, usually a hook-in whose upstream API
moved, and commit each fix as `fix(conductor): <what> for <tag>`. Do not run repo-wide checks.

For a fuller pass over everything the fork touches, `pnpm exec vp run check:changed <new-tag>`
runs format, lint, knip, typecheck, and the tests beside changed files. Browser tests need
`(cd apps/web && pnpm exec playwright install chromium-headless-shell)` once. Upstream's
"a shortcut conditioned on rightPanelOpen sees the thread's open right panel" browser test
already failed at v0.1.11 when it ran after the Linear issue test, so judge it against upstream
before chasing it.

## 6. Build

```sh
scripts/conductor/build.sh
```

It takes several minutes, so give it a long timeout or run it in the background and wait. The
last line it prints is the built app's path, normally `release/conductor/T3 Code (Beta).app`.
Without Rust it reuses the resource monitor binary from the installed app, and it refuses when
that binary's source changed upstream. In that case, ask the user to install Rust from
https://rustup.rs or to accept the old binary with `CONDUCTOR_ALLOW_STALE_RESOURCE_MONITOR=1`.

## 7. Push

```sh
git push --force-with-lease origin conductor
git push origin <backup-branch>
```

If a push fails, tell the user and carry on. The local branches are what matter.

## 8. Ask, then install

Tell the user the old and new base tag, the commits replayed, the conflicts you resolved and how,
the typecheck result, and the built app path. Then ask whether to install it. Wait for an
explicit yes in their own message.

```sh
scripts/conductor/install.sh "release/conductor/T3 Code (Beta).app"
```

Because T3 Code is running, the script schedules the swap for right after it quits and reopens
the app on its own. Tell the user to quit T3 Code with Cmd+Q when it suits them. The new version
opens a few seconds later, and Settings > About shows it. This build is not signed by T3 Tools,
so macOS may ask again for privacy permissions and for keychain access. Answer the keychain
prompt with "Always Allow". `scripts/conductor/install.sh --cancel` drops a swap that has not
happened yet.

## Rollback

- `scripts/conductor/install.sh "release/backup/T3 Code (Beta).app"` swaps the previous app back,
  and the current app becomes the backup. It applies on the next quit as above.
- `git branch --list 'conductor-backup/*'` lists the stacks from earlier upgrades.
  With the user's agreement, `git switch conductor && git reset --hard <backup-branch>`, then
  build, push with `--force-with-lease`, and install as in steps 6 to 8.
- An older release may not read a database that a newer build already migrated. Warn the user
  before installing a build older than the one running.
- To leave the fork, install the official app from https://github.com/pingdotgg/t3code/releases.
  It uses the same data directory, `~/.t3/userdata`.
