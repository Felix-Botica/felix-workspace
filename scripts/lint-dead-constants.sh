#!/usr/bin/env bash
# lint-dead-constants.sh
#
# Flags JS/TS/Python declarations of "rule-ish" constants (PAUSED_*, BANNED_*,
# BLOCKED_*, _ACCOUNTS, _RULES, DENY_, ALLOW_) that appear exactly once in their
# source file — i.e. declared but never read. This catches the "safety rule
# pretending to exist" anti-pattern that caused the 2026-04-21 @nyloncherie
# near-breach (PAUSED_ACCOUNTS declared in nylongerie-select-v3.js, never
# referenced anywhere, cosmetic protection only).
#
# Usage:
#   bash scripts/lint-dead-constants.sh                 # lint the default scanned dirs
#   bash scripts/lint-dead-constants.sh path/to/file.js # lint one file
#
# Exit code:
#   0 = no dead rule-constants found
#   1 = at least one dead rule-constant found (print list, can wire to CI)

set -euo pipefail

SCAN_ROOTS=(
  "$HOME/.openclaw/nylongerie"
  "$HOME/.openclaw/workspace/scripts"
  "$HOME/.openclaw/workspace"
)

# regex: names that look like safety-rule constants (expand as policies grow)
NAME_RE='\b(PAUSED|BANNED|BLOCKED|DENY|DENYLIST|DISALLOWED|FORBIDDEN|ALLOW|ALLOWLIST|REQUIRED|MANDATORY)_[A-Z0-9_]+\b'

hits=0

scan_file() {
  local f="$1"
  # Only scan source files
  case "$f" in
    *.js|*.mjs|*.cjs|*.ts|*.py) ;;
    *) return 0 ;;
  esac
  # extract candidate names (dedup)
  local names
  names="$(grep -oE "$NAME_RE" "$f" 2>/dev/null | sort -u)" || return 0
  [ -z "$names" ] && return 0
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    # Count occurrences in file as whole words
    local n
    n="$(grep -c -wE "$name" "$f" || true)"
    if [ "$n" -le 1 ]; then
      printf '  DEAD  %-30s in %s  (refs=%s)\n' "$name" "$f" "$n"
      hits=$((hits + 1))
    fi
  done <<< "$names"
}

if [ $# -gt 0 ]; then
  for f in "$@"; do scan_file "$f"; done
else
  for root in "${SCAN_ROOTS[@]}"; do
    [ -d "$root" ] || continue
    # Exclude node_modules, temp, sessions, anything big
    while IFS= read -r f; do
      scan_file "$f"
    done < <(find "$root" -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.ts' -o -name '*.py' \) \
              -not -path '*/node_modules/*' \
              -not -path '*/sessions*' \
              -not -path '*/temp/*' \
              -not -path '*/.git/*' )
  done
fi

if [ "$hits" -eq 0 ]; then
  echo "lint-dead-constants: clean."
  exit 0
fi
echo
echo "lint-dead-constants: $hits dead rule-constant(s) above — these are declarations with zero references in their own file, i.e. safety rules pretending to exist."
echo "See workspace/ACCOUNT_RULES.md for the 2026-04-21 incident that motivated this linter."
exit 1
