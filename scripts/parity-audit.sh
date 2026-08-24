#!/usr/bin/env bash
# Parity audit — anti-drift rule R1 (plan §08).
#
# Every ported file opens with a marker naming its source:
#   // PORT: apps/desktop/src-tauri/src/<path>
#   // PORT: apps/desktop/src/<path>
# This script diffs the marker set against the source tree and fails when a
# source file has no porter and no waiver. Run from the repo root; CI runs
# it from G1 onward.
#
# Usage: scripts/parity-audit.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

ported_list="$(mktemp)"
source_list="$(mktemp)"
unported_list="$(mktemp)"
trap 'rm -f "$ported_list" "$source_list" "$unported_list"' EXIT

# 1. Collect every marker in the new tree.
grep -rho '// PORT: [^ *]*' crates/ 2>/dev/null | sed 's|// PORT: ||' | sort -u > "$ported_list" || true

# 2. Collect every source file in the old tree (both languages).
{
  find apps/desktop/src -name '*.ts' -o -name '*.tsx' 2>/dev/null
  find apps/desktop/src-tauri/src -name '*.rs' 2>/dev/null
} | sort > "$source_list"

# 3. Unported = sources minus ported minus waivers.
comm -13 "$ported_list" "$source_list" > "$unported_list"

waivers="docs/parity/waivers.txt"
if [[ -f "$waivers" ]]; then
  filtered="$(mktemp)"
  trap 'rm -f "$ported_list" "$source_list" "$unported_list" "$filtered"' EXIT
  grep -v -f "$waivers" "$unported_list" > "$filtered" || true
  mv "$filtered" "$unported_list"
fi

total_sources="$(wc -l < "$source_list" | tr -d ' ')"
total_ported="$(wc -l < "$ported_list" | tr -d ' ')"
total_unported="$(wc -l < "$unported_list" | tr -d ' ')"

echo "sources: $total_sources · marked ported: $total_ported · unported: $total_unported"

if [[ "$total_unported" -gt 0 ]]; then
  echo ""
  echo "unported source files (add a // PORT: marker or a waiver):"
  head -50 "$unported_list"
  exit 1
fi

echo "parity audit clean"
