#!/usr/bin/env node
// DEPRECATED 2026-04-24 by Refactor C (follow-up).
// This was the legacy "Hybrid Orchestrator" that combined selection, drafting,
// and publishing into one script. It has been superseded by the Refactor C
// pipeline split (2026-04-22):
//   - Selection + drafts:  /Users/lothareckstein/.openclaw/pipelines/post/select.js
//   - Publishing:          /Users/lothareckstein/.openclaw/pipelines/post/publish.js
// Canonical docs:
//   - /Users/lothareckstein/.openclaw/pipelines/post/README.md
//   - /Users/lothareckstein/.openclaw/workspace/NYLONGERIE_PIPELINE.md
// Rules SSOT: /Users/lothareckstein/.openclaw/config/nylongerie.json
//
// If you landed here, something is still calling the old path.
// DO NOT restore this file. Update the caller.
// Original content preserved at post-workflow.js.deprecated-refactorC-20260424.
console.error('DEPRECATED: workspace/post-workflow.js — use pipelines/post/select.js then pipelines/post/publish.js. See pipelines/post/README.md');
process.exit(2);
