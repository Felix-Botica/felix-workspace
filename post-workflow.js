#!/usr/bin/env node
// DEPRECATED 2026-04-24 by Refactor C (follow-up).
// This was the legacy "Hybrid Orchestrator" that combined selection, drafting,
// and publishing into one script. It has been superseded by the Refactor C
// pipeline split (2026-04-22), then direct POST selection was disabled
// on 2026-05-09. Feed-post drafts now come from RECYCLE only.
//   - Feed-post drafts:    /Users/lothareckstein/.openclaw/pipelines/recycle/select.js
//   - Publishing:          /Users/lothareckstein/.openclaw/pipelines/post/publish.js
// Canonical docs:
//   - /Users/lothareckstein/.openclaw/pipelines/post/README.md
//   - /Users/lothareckstein/.openclaw/workspace/NYLONGERIE_PIPELINE.md
// Rules SSOT: /Users/lothareckstein/.openclaw/config/nylongerie.json
//
// If you landed here, something is still calling the old path.
// DO NOT restore this file. Update the caller.
// Original content preserved at post-workflow.js.deprecated-refactorC-20260424.
console.error('DISABLED: workspace/post-workflow.js — direct POST selection is disabled. Use pipelines/recycle/select.js for feed-post drafts.');
process.exit(2);
