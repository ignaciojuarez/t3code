#!/usr/bin/env bash
# Install a Conductor fork build as /Applications/T3 Code (Beta).app.
# Usage: scripts/conductor/install.sh [path/to/T3 Code (Beta).app]   (default: release/conductor/...)
#        scripts/conductor/install.sh --cancel     drop a swap that is waiting for T3 Code to quit
# While T3 Code runs, a one-shot launchd job swaps the bundle right after it quits and reopens it.
# The running app is never signalled. The previous bundle becomes the single backup in
# release/backup, and the built bundle is moved into place rather than copied.
set -euo pipefail

app_name="T3 Code (Beta).app"
bundle_id="com.t3tools.t3code"
label="${CONDUCTOR_INSTALL_LABEL:-com.t3tools.t3code.conductor-install}"
domain="gui/$(id -u)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

plist_value() { /usr/libexec/PlistBuddy -c "Print :$2" "$1/Contents/Info.plist" 2>/dev/null; }

# Processes of the app and its backend run from inside the bundle, so their paths name it.
bundle_processes() {
  local prefix="$1/Contents/" pid comm
  while read -r pid comm; do
    case "$comm" in "$prefix"*) echo "$pid" ;; esac
  done < <(ps -axo pid=,comm=)
}

main_running() {
  local exe pid comm
  exe="$1/Contents/MacOS/$2"
  while read -r pid comm; do
    [ "$comm" = "$exe" ] && return 0
  done < <(ps -axo pid=,comm=)
  return 1
}

same_volume() { [ "$(stat -f %d "$1")" = "$(stat -f %d "$2")" ]; }

notify() {
  osascript -e "display notification \"$1\" with title \"T3 Code Conductor\"" >/dev/null 2>&1 || true
}

# Swap src into dest, keeping dest as the only backup. Restores what it can on failure.
swap() {
  local src="$1" dest="$2" backup_dir="$3"
  local parent staged backup moved=0
  parent="$(dirname "$dest")"
  staged="$parent/.conductor-staged-$(basename "$dest")"
  backup="$backup_dir/$(basename "$dest")"

  [ -d "$src/Contents" ] || { log "The build to install is gone: $src"; return 1; }
  rm -rf "$staged"
  if same_volume "$src" "$parent"; then
    mv "$src" "$staged" || { log "Could not move $src next to $dest."; return 1; }
    moved=1
  else
    ditto "$src" "$staged" || { log "Could not copy $src next to $dest."; rm -rf "$staged"; return 1; }
  fi

  mkdir -p "$backup_dir"
  if [ -e "$dest" ]; then
    if [ -e "$backup" ] && ! rm -rf "$backup"; then
      log "Could not remove the old backup $backup."
    fi
    if [ -e "$backup" ] || ! mv "$dest" "$backup"; then
      log "Could not move $dest to $backup; leaving it in place."
      if [ "$moved" = 1 ]; then mv "$staged" "$src"; else rm -rf "$staged"; fi
      return 1
    fi
  fi

  if ! mv "$staged" "$dest"; then
    log "Could not move the new build into $dest; restoring the previous app."
    [ -e "$backup" ] && mv "$backup" "$dest"
    if [ "$moved" = 1 ]; then mv "$staged" "$src"; else rm -rf "$staged"; fi
    return 1
  fi
  xattr -dr com.apple.quarantine "$dest" 2>/dev/null || true
  log "Installed $(plist_value "$dest" CFBundleShortVersionString) at $dest; previous app kept at $backup."
}

# Runs under launchd so it survives the app quitting; arguments come from schedule below.
run_job() {
  local src="$1" dest="$2" backup_dir="$3" executable="$4" plist="$5" reopen="$6"
  log "Waiting for $dest to quit."
  while :; do
    while main_running "$dest" "$executable"; do sleep 2; done
    # Helpers and the backend exit just after the main process; give them a minute.
    local tries=0
    while [ -n "$(bundle_processes "$dest")" ] && [ "$tries" -lt 30 ]; do
      sleep 2
      tries=$((tries + 1))
    done
    main_running "$dest" "$executable" || break
  done
  if ! swap "$src" "$dest" "$backup_dir"; then
    notify "The Conductor fork build could not be installed. See $(dirname "$plist")/install.log"
  fi
  if [ "$reopen" = 1 ]; then open "$dest" || log "Could not reopen $dest."; fi
  rm -f "$plist"
  launchctl bootout "$domain/$label" >/dev/null 2>&1 || true
}

xml_escape() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' <<<"$1"; }

cancel() {
  local repo
  repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  rm -f "$repo/release/install-job/$label.plist"
  if launchctl bootout "$domain/$label" >/dev/null 2>&1; then
    echo "Cancelled the pending install."
  else
    echo "No install is pending."
  fi
}

main() {
  local repo dest src backup_dir job_dir
  repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  dest="${CONDUCTOR_INSTALL_DEST:-/Applications/$app_name}"
  src="${1:-$repo/release/conductor/$app_name}"
  backup_dir="$repo/release/backup"
  job_dir="$repo/release/install-job"

  [ -d "$src" ] || { echo "No app at $src. Build one with scripts/conductor/build.sh." >&2; exit 2; }
  src="$(cd "$src" && pwd)"
  [ "$(plist_value "$src" CFBundleIdentifier)" = "$bundle_id" ] ||
    { echo "$src is not a T3 Code app ($bundle_id)." >&2; exit 2; }
  [ -f "$src/Contents/Resources/app.asar" ] || { echo "$src has no app.asar; is the build complete?" >&2; exit 2; }
  [ "$src" != "$dest" ] || { echo "$src is already the installed app." >&2; exit 2; }

  local new_version current_version executable
  new_version="$(plist_value "$src" CFBundleShortVersionString)"
  current_version="$(plist_value "$dest" CFBundleShortVersionString || echo none)"
  executable="$(plist_value "$dest" CFBundleExecutable || plist_value "$src" CFBundleExecutable)"

  echo "Installing T3 Code $new_version from:"
  echo "  $src"
  echo "over $dest (currently ${current_version:-none})."
  echo "The current app becomes the only backup, at $backup_dir/$app_name."
  echo "The build is moved into place, so $src will be gone afterwards."
  echo "This build is not signed by T3 Tools: macOS may ask again for keychain access and permissions."

  if launchctl print "$domain/$label" >/dev/null 2>&1; then
    echo "Replacing an install that was already waiting."
    launchctl bootout "$domain/$label" >/dev/null 2>&1 || true
  fi

  if [ -z "$(bundle_processes "$dest")" ]; then
    swap "$src" "$dest" "$backup_dir"
    echo "Done. Open T3 Code to use it."
    return
  fi

  mkdir -p "$job_dir"
  local job_script="$job_dir/install.sh" plist="$job_dir/$label.plist" job_log="$job_dir/install.log"
  # The job runs a copy, so a rebase that changes this script cannot change a scheduled swap.
  cp "${BASH_SOURCE[0]}" "$job_script"
  chmod 755 "$job_script"
  local args=(/bin/bash "$job_script" --job "$src" "$dest" "$backup_dir" "$executable" "$plist"
    "${CONDUCTOR_INSTALL_REOPEN:-1}")
  {
    echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    echo '<plist version="1.0"><dict>'
    echo "<key>Label</key><string>$(xml_escape "$label")</string>"
    echo '<key>ProgramArguments</key><array>'
    for arg in "${args[@]}"; do echo "<string>$(xml_escape "$arg")</string>"; done
    echo '</array>'
    echo '<key>EnvironmentVariables</key><dict>'
    echo "<key>CONDUCTOR_INSTALL_LABEL</key><string>$(xml_escape "$label")</string>"
    echo '</dict>'
    echo '<key>RunAtLoad</key><true/>'
    echo '<key>KeepAlive</key><false/>'
    echo '<key>AbandonProcessGroup</key><true/>'
    echo "<key>StandardOutPath</key><string>$(xml_escape "$job_log")</string>"
    echo "<key>StandardErrorPath</key><string>$(xml_escape "$job_log")</string>"
    echo '</dict></plist>'
  } >"$plist"
  plutil -lint "$plist" >/dev/null
  : >"$job_log"
  launchctl bootstrap "$domain" "$plist"

  echo "T3 Code is running, so nothing changes yet. A launchd job ($label) will swap the app"
  echo "right after T3 Code quits and then reopen it. Quit with Cmd+Q when you are ready."
  echo "Cancel: scripts/conductor/install.sh --cancel    Log: $job_log"
}

case "${1:-}" in
  --job)
    shift
    run_job "$@"
    ;;
  --cancel) cancel ;;
  -h | --help) sed -n '2,7p' "${BASH_SOURCE[0]}" ;;
  *) main "$@" ;;
esac
