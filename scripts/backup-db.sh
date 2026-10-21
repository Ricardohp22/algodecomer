#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/db.sh
source "$ROOT/scripts/lib/db.sh"

mkdir -p "$ROOT/.backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="$ROOT/.backups/algodecomer-$STAMP.dump"

dump_database "$DUMP"

echo "$DUMP"
