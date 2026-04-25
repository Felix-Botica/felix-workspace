#!/bin/bash
# Manual convenience for dry-running a promo story.
# Refactor C (2026-04-22): script moved to pipelines/story/promo.js and is
# invoked from repo root; --account is ignored (rotation wins via used-stories.json).
set -euo pipefail
cd /Users/lothareckstein/.openclaw
bash scripts/preflight.sh
node pipelines/story/promo.js --theme "Spring Collection" --discount 25 --code SPRING25 --template sale --dry-run