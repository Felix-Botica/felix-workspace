#!/usr/bin/env node
/**
 * nylongerie-add-reels.js
 *
 * Scans inbox for video files (.mp4/.mov) not yet in classify-results.json,
 * adds them as type: 'reel' so the series linker can map handles.
 *
 * No AI calls — just filesystem scan + JSON merge.
 * Run nylongerie-series-link.js AFTER this to propagate handles.
 *
 * Usage:
 *   node nylongerie-add-reels.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');
const RESULTS_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results.json');
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov']);

const dryRun = process.argv.includes('--dry-run');

function getVideoDuration(filePath) {
  try {
    const out = execSync(
      `ffprobe -v quiet -print_format json -show_format "${filePath}"`,
      { timeout: 10000 }
    );
    const data = JSON.parse(out.toString());
    return parseFloat(data.format?.duration || 0);
  } catch {
    return 0;
  }
}

function main() {
  // Load existing classify-results
  if (!fs.existsSync(RESULTS_FILE)) {
    console.error('❌ classify-results.json not found');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  const existingFiles = new Set(results.map(e => e.file || e.filename));

  console.log(`\n📹 Nylongerie Reels Scanner`);
  console.log(`   Existing entries: ${results.length}`);
  console.log(`   Mode: ${dryRun ? '🧪 DRY RUN' : '🔴 LIVE'}\n`);

  // Scan inbox for videos
  const inboxFiles = fs.readdirSync(INBOX);
  const videos = inboxFiles.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return VIDEO_EXTENSIONS.has(ext) && !existingFiles.has(f);
  });

  console.log(`   Videos in inbox: ${inboxFiles.filter(f => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase())).length}`);
  console.log(`   Already classified: ${inboxFiles.filter(f => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase()) && existingFiles.has(f)).length}`);
  console.log(`   New to add: ${videos.length}\n`);

  if (videos.length === 0) {
    console.log('✅ No new videos to add.');
    return;
  }

  // Sort alphabetically (same as iPhone photo order = chronological)
  videos.sort((a, b) => a.localeCompare(b));

  const newEntries = [];

  for (const filename of videos) {
    const filePath = path.join(INBOX, filename);
    const duration = getVideoDuration(filePath);

    const entry = {
      file: filename,
      type: 'reel',
      style: null,       // will be inferred from series context or manual
      handle: null,       // will be set by series-link.js
      nylon_color: null,
      sex_appeal: null,
      duration_seconds: Math.round(duration * 10) / 10,
      added_by: 'nylongerie-add-reels.js',
      added_at: new Date().toISOString().slice(0, 10),
    };

    newEntries.push(entry);
    console.log(`   + ${filename} (${duration.toFixed(1)}s)`);
  }

  if (dryRun) {
    console.log(`\n🧪 DRY RUN — would add ${newEntries.length} entries. No files changed.`);
    return;
  }

  // Append to classify-results.json
  results.push(...newEntries);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  console.log(`\n✅ Added ${newEntries.length} reels to classify-results.json`);
  console.log(`   Total entries now: ${results.length}`);
  console.log(`\n⏭️  Next step: run nylongerie-series-link.js to map handles`);
}

main();
