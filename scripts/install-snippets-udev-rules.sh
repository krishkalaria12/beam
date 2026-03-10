#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULE_SOURCE="$ROOT_DIR/desktop-integrations/udev/70-beam-snippets.rules"
RULE_DEST="/etc/udev/rules.d/70-beam-snippets.rules"

if [[ ! -f "$RULE_SOURCE" ]]; then
  echo "beam: missing udev rules file at $RULE_SOURCE" >&2
  exit 1
fi

install -Dm644 "$RULE_SOURCE" "$RULE_DEST"
udevadm control --reload-rules
udevadm trigger --subsystem-match=input

cat <<EOF
Installed Beam snippet runtime udev rules:
  $RULE_DEST

Log out and back in if Beam still cannot access /dev/input or /dev/uinput.
EOF
