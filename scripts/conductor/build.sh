#!/usr/bin/env bash
# Build the Conductor fork as an unsigned macOS arm64 "T3 Code (Beta).app".
# Usage: scripts/conductor/build.sh        The last line of stdout is the built app's path.
# The app is versioned as its upstream base tag and checks pingdotgg/t3code for releases, so
# "update available" means a newer upstream release to rebase onto. Only one build is kept.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo"

app_name="T3 Code (Beta).app"
rust_target="aarch64-apple-darwin"
install_label="com.t3tools.t3code.conductor-install"
out_dir="$repo/release/conductor"
artifacts_dir="$repo/release/conductor-artifacts"
monitor="$repo/native/resource-monitor/target/$rust_target/release/t3-resource-monitor"
monitor_source="$monitor.source-tag"
installed_monitor="/Applications/$app_name/Contents/Resources/resource-monitor/t3-resource-monitor"
installed_plist="/Applications/$app_name/Contents/Info.plist"

fail() {
  echo "build.sh: $*" >&2
  exit 1
}

[ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ] || fail "only macOS on Apple Silicon is supported."

if launchctl print "gui/$(id -u)/$install_label" >/dev/null 2>&1; then
  fail "an install is waiting for T3 Code to quit and would pick up this build half-written. Quit T3 Code first, or run scripts/conductor/install.sh --cancel."
fi

missing=()
for tool in node pnpm clang make sips ditto; do
  command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
done
xcrun --find iconutil >/dev/null 2>&1 || missing+=("iconutil")
[ "${#missing[@]}" -eq 0 ] || fail "missing prerequisites: ${missing[*]} (install Xcode Command Line Tools: xcode-select --install)."

tag="$(scripts/conductor/base.sh)"
version="${tag#v}"

# The resource monitor is a Rust binary. Without cargo, reuse a prebuilt one, but only while its
# source is unchanged since the release it came from.
reuse_monitor=false
if command -v cargo >/dev/null 2>&1; then
  echo "Building the resource monitor with $(cargo --version)."
else
  if [ ! -x "$monitor" ]; then
    [ -x "$installed_monitor" ] || fail "cargo is not installed and no prebuilt resource monitor exists. Install Rust (https://rustup.rs, then: rustup target add $rust_target)."
    installed_version="$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$installed_plist")"
    mkdir -p "$(dirname "$monitor")"
    cp "$installed_monitor" "$monitor"
    chmod 755 "$monitor"
    echo "v$installed_version" >"$monitor_source"
    echo "Copied the resource monitor from the installed T3 Code $installed_version."
  fi
  source_tag="$(cat "$monitor_source" 2>/dev/null || echo unknown)"
  if ! git rev-parse -q --verify "refs/tags/$source_tag" >/dev/null ||
    [ -n "$(git diff --name-only "$source_tag" HEAD -- native/resource-monitor)" ]; then
    if [ "${CONDUCTOR_ALLOW_STALE_RESOURCE_MONITOR:-0}" != "1" ]; then
      fail "cargo is not installed and native/resource-monitor changed since the prebuilt binary's release ($source_tag). Install Rust (https://rustup.rs), or set CONDUCTOR_ALLOW_STALE_RESOURCE_MONITOR=1 to ship the old binary anyway."
    fi
    echo "warning: shipping a resource monitor built from $source_tag; its source has changed since." >&2
  fi
  reuse_monitor=true
  echo "cargo not found; reusing the prebuilt resource monitor from $source_tag."
fi

free_gb="$(df -g "$repo" | awk 'NR == 2 { print $4 }')"
if [ "${free_gb:-0}" -lt 5 ]; then
  echo "warning: only ${free_gb} GB free; a desktop build stages a few GB temporarily." >&2
fi

# Only one build is kept; the installer keeps the previous app in release/backup.
rm -rf "$out_dir" "$artifacts_dir"

echo "Building T3 Code $version (Conductor fork, based on $tag)..."
# The zip target is the smallest one for which electron-builder writes app-update.yml, which the
# updater needs to keep checking upstream for releases.
env \
  T3CODE_DESKTOP_UPDATE_REPOSITORY=pingdotgg/t3code \
  VITE_CONDUCTOR_FORK_ROOT="$repo" \
  T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR="$reuse_monitor" \
  node scripts/build-desktop-artifact.ts \
  --platform mac \
  --target zip \
  --arch arm64 \
  --build-version "$version" \
  --output-dir "$artifacts_dir"

zip="$artifacts_dir/T3-Code-$version-arm64.zip"
[ -f "$zip" ] || fail "expected $zip after the build."
mkdir -p "$out_dir"
ditto -x -k "$zip" "$out_dir"
rm -rf "$artifacts_dir"

app="$out_dir/$app_name"
[ -d "$app" ] || fail "expected $app inside the build archive."
[ -f "$app/Contents/Resources/app-update.yml" ] || fail "$app has no app-update.yml, so it could not check upstream for releases."

echo "Built T3 Code $version at:"
echo "$app"
