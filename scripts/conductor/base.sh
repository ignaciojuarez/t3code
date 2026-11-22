#!/usr/bin/env bash
# Print the upstream stable release tag the conductor branch is built on.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git describe --tags --abbrev=0 --match 'v[0-9]*' --exclude '*-*' "${1:-HEAD}"
