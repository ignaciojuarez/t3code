# Conductor fork

A personal fork of [T3 Code](https://github.com/pingdotgg/t3code) with a Conductor-style look and
a few upstream behaviors turned off. It is built locally and installed over
`/Applications/T3 Code (Beta).app`, sharing the official app's data in `~/.t3/userdata`.

## Branches

- `conductor` is a stack of fork commits on top of an upstream stable tag such as `v0.1.11`.
  `scripts/conductor/base.sh` prints that tag.
- `conductor-backup/<tag>-<timestamp>` branches hold the stack as it was before each upgrade.
- `upstream` is pingdotgg/t3code and `origin` is the fork on GitHub.

See the stack with `git log --oneline $(scripts/conductor/base.sh)..conductor` and every touched
file with `git diff $(scripts/conductor/base.sh)...conductor --stat`.

## Where fork code lives

- `apps/web/src/conductor/`: fork UI. `flags.ts` turns upstream behaviors off; `upgrade/` runs the
  fork upgrade from the update button.
- `apps/desktop/src/conductor/`: the guard that stops the desktop app installing upstream builds.
- `apps/web/src/conductor/forkThemes.ts`: the fork's built-in themes, Conductor (`conductorTheme.ts`) and Claude Clay (`claudeClayTheme.ts`), a copy of the Open VSX theme. Upstream's theme lists spread `FORK_THEMES` in `themePalette.ts`, `ThemeSettings.tsx`, and `CommandPaletteThemeItems.tsx`.
- `scripts/conductor/`: upgrade, build, and install scripts.
- `.agents/skills/conductor-upgrade/`: the procedure the upgrade agent follows.

Upstream files only get small hook-ins that call into these, so rebases rarely conflict. Keep it
that way. New logic goes in the fork directories, and a hook-in whose reason is not obvious gets a
one-line `Conductor:` comment.

## Updates and upgrades

The app still checks pingdotgg/t3code for releases, but it never downloads or installs one,
because that would replace the fork. Startup recovery and update requests from remote servers are
refused the same way. When upstream has a newer stable release, the sidebar update button and Settings > About
show "Upgrade fork". Clicking it starts a thread in this repository's project, or reopens the one
already running for that release. Its agent follows the
[conductor-upgrade skill](.agents/skills/conductor-upgrade/SKILL.md). It rebases onto the release,
typechecks, builds, pushes, and installs once you agree. The swap happens when you next quit T3
Code, and the app reopens on the new version.

If launching the thread fails, you get an error toast and a draft with the upgrade prompt.

## Manual build and install

```sh
scripts/conductor/upgrade.sh [vX.Y.Z]   # rebase onto a release (default: newest stable)
scripts/conductor/build.sh              # unsigned arm64 app in release/conductor/
scripts/conductor/install.sh            # install it now, or right after T3 Code quits
scripts/conductor/install.sh --cancel   # drop a swap that is still waiting
```

The build needs Xcode Command Line Tools. Rust is optional. Without `cargo`, the build reuses the
resource monitor binary from the installed app as long as `native/resource-monitor` has not
changed since that release. Builds are unsigned, so macOS may ask again for keychain access and
privacy permissions after an install.

## Rollback

- `scripts/conductor/install.sh "release/backup/T3 Code (Beta).app"` swaps the previous app back.
  Only one backup is kept.
- To go back to earlier code, reset `conductor` to a `conductor-backup/*` branch, then build and
  install.
- To leave the fork, install the official app from the upstream releases page.
