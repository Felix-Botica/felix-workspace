#!/usr/bin/env node
/**
 * nylongerie-reel-handles.js
 *
 * Propagates real handles from series-map-final.json onto reels in classify-results.json.
 *
 * Strategy (in order):
 *   1. Content overlap: reel is in a model-series whose screenshot or sibling images
 *      appear in series-map-final (which has verified real handles).
 *   2. Timestamp proximity: for orphan reels (not in any series), find the nearest
 *      screenshot by file creation date (macOS mdls) and inherit its handle from
 *      series-map-final.
 *
 * Usage:
 *   node nylongerie-reel-handles.js              # live run
 *   node nylongerie-reel-handles.js --dry-run    # preview only
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = path.join(process.env.HOME, '.openclaw', 'nylongerie');
const RESULTS_FILE = path.join(BASE, 'classify-results.json');
const SERIES_FINAL = path.join(BASE, 'series-map-final.json');
const MODEL_SERIES = path.join(BASE, 'model-series.json');
const INBOX = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');

const DRY_RUN = process.argv.includes('--dry-run');

const PLACEHOLDERS = new Set([
  '@username', '@handle if visible else null', '@username or null',
  '@handle_visible', '@username_here', '@null', '@username_not_visible',
  '@username_or_null', '@handle_if_visible_else_null',
  '@handle_not_visible_in_image', '@brand_name'
]);

function isRealHandle(h) {
  return h && !PLACEHOLDERS.has(h) && h !== 'null' && /^@[\w.]+/.test(h);
}

function getCreationDate(filename) {
  const fp = path.join(INBOX, filename);
  if (!fs.existsSync(fp)) return null;
  try {
    const out = execSync(`mdls -name kMDItemContentCreationDate -raw "${fp}"`, { timeout: 3000 }).toString().trim();
    if (out && out !== '(null)') return new Date(out).getTime();
  } catch {}
  return null;
}

function main() {
  const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  const smf = JSON.parse(fs.readFileSync(SERIES_FINAL, 'utf8'));
  const ms = JSON.parse(fs.readFileSync(MODEL_SERIES, 'utf8'));

  console.log(`\n🎬 Reel Handle Propagation`);
  console.log(`   Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🔴 LIVE'}\n`);

  // Build lookup: file → real handle from series-map-final
  const fileToHandle = {};
  for (const s of smf) {
    if (s.handle) {
      fileToHandle[s.screenshot] = s.handle;
      for (const img of (s.images || [])) {
        fileToHandle[img] = s.handle;
      }
    }
  }

  // Build lookup: file → classify entry index
  const fileIndex = {};
  results.forEach((item, i) => { fileIndex[item.file] = i; });

  // Identify all reels
  const reels = results.filter(e => e.type === 'reel');
  const reelsAlreadyResolved = reels.filter(e => isRealHandle(e.handle));

  console.log(`   Total reels: ${reels.length}`);
  console.log(`   Already have real handles: ${reelsAlreadyResolved.length}`);

  // --- PASS 1: Content overlap via model-series ---
  // For each model-series entry containing reels, find real handle via smf content overlap
  const reelsInSeries = new Set();
  let pass1Count = 0;

  for (const entry of ms) {
    const allFiles = [entry.screenshot, ...(entry.content || [])];
    const vids = (entry.content || []).filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));
    if (vids.length === 0) continue;

    // Mark these reels as "in a series"
    vids.forEach(v => reelsInSeries.add(v));

    // Find real handle from any file in this series
    let handle = null;
    for (const f of allFiles) {
      if (fileToHandle[f]) { handle = fileToHandle[f]; break; }
    }
    // Also check classify-results entries for sibling real handles
    if (!handle) {
      for (const f of allFiles) {
        const idx = fileIndex[f];
        if (idx !== undefined && isRealHandle(results[idx].handle)) {
          handle = results[idx].handle;
          break;
        }
      }
    }

    if (!handle) continue;

    // Propagate to all reels in this series
    for (const vid of vids) {
      const idx = fileIndex[vid];
      if (idx === undefined) continue;
      if (isRealHandle(results[idx].handle)) continue; // already resolved

      results[idx].handle = handle;
      results[idx].handleSource = 'series-overlap';
      results[idx].linkedFrom = results[idx].linkedFrom || entry.screenshot;
      pass1Count++;
      console.log(`   ✅ [series] ${vid} → ${handle}`);
    }
  }

  console.log(`\n   Pass 1 (series overlap): ${pass1Count} reels resolved`);

  // --- PASS 2: Timestamp proximity for orphan reels ---
  const orphanReels = reels.filter(r => !reelsInSeries.has(r.file) && !isRealHandle(r.handle));
  console.log(`   Orphan reels to resolve: ${orphanReels.length}`);

  if (orphanReels.length > 0) {
    // Get creation dates for all smf screenshots
    console.log(`   Fetching creation dates for screenshots...`);
    const screenshotDates = [];
    for (const s of smf) {
      if (!s.handle) continue;
      const ts = getCreationDate(s.screenshot);
      if (ts) screenshotDates.push({ file: s.screenshot, handle: s.handle, ts });
    }
    screenshotDates.sort((a, b) => a.ts - b.ts);
    console.log(`   Screenshots with dates: ${screenshotDates.length}`);

    let pass2Count = 0;
    const MAX_GAP_MS = 10 * 60 * 1000; // 10 minutes — screenshot and reel should be very close

    for (const reel of orphanReels) {
      const reelTs = getCreationDate(reel.file);
      if (!reelTs) continue;

      // Find nearest screenshot by timestamp
      let bestDist = Infinity;
      let bestMatch = null;
      for (const ss of screenshotDates) {
        // Reel should come AFTER its screenshot (reel saved after screenshot)
        const dist = Math.abs(reelTs - ss.ts);
        if (dist < bestDist) {
          bestDist = dist;
          bestMatch = ss;
        }
      }

      if (bestMatch && bestDist <= MAX_GAP_MS) {
        const idx = fileIndex[reel.file];
        if (idx === undefined) continue;

        results[idx].handle = bestMatch.handle;
        results[idx].handleSource = 'timestamp-proximity';
        results[idx].linkedFrom = bestMatch.file;
        results[idx].timestampGapMs = bestDist;
        pass2Count++;
        console.log(`   ✅ [timestamp] ${reel.file} → ${bestMatch.handle} (${Math.round(bestDist / 1000)}s gap)`);
      }
    }

    console.log(`\n   Pass 2 (timestamp proximity): ${pass2Count} reels resolved`);
  }

  // --- Summary ---
  const finalReels = results.filter(e => e.type === 'reel');
  const finalResolved = finalReels.filter(e => isRealHandle(e.handle));
  const finalUnresolved = finalReels.filter(e => !isRealHandle(e.handle));

  console.log(`\n📊 SUMMARY`);
  console.log(`   Total reels: ${finalReels.length}`);
  console.log(`   With real handles: ${finalResolved.length}`);
  console.log(`   Still unresolved: ${finalUnresolved.length}`);

  if (finalUnresolved.length > 0 && finalUnresolved.length <= 20) {
    console.log(`\n   Unresolved reels:`);
    finalUnresolved.forEach(r => console.log(`     - ${r.file}`));
  }

  // Save
  if (!DRY_RUN) {
    // Backup first
    const backupFile = RESULTS_FILE.replace('.json', `-backup-${Date.now()}.json`);
    fs.copyFileSync(RESULTS_FILE, backupFile);
    console.log(`\n💾 Backup: ${path.basename(backupFile)}`);

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`💾 Updated: classify-results.json`);
  } else {
    console.log(`\n🧪 DRY RUN — no files changed.`);
  }
}

main();
