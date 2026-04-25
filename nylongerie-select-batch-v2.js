#!/usr/bin/env node
/**
 * nylongerie-select-batch-v2.js
 * Selects 7 posts (1 per account) from classify-results.json (v2 format).
 * Maps v2 styles (stockings, tights, catsuit...) to account targets.
 *
 * Output: batch-selections.json (compatible with nylongerie-create-batch.js)
 */

const fs = require('fs');
const path = require('path');

const CLASSIFY = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results-clean.json');
const SERIES_MAP = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'series-map-final.json');
const QUEUE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const INBOX_DIR = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');
const OUTPUT = path.join(process.env.HOME, '.openclaw', 'workspace', 'batch-selections.json');

// Load data
const classified = JSON.parse(fs.readFileSync(CLASSIFY, 'utf8'));
const seriesMap = JSON.parse(fs.readFileSync(SERIES_MAP, 'utf8'));

let queue = [];
if (fs.existsSync(QUEUE)) {
  queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
}
const usedFiles = new Set(queue.map(q => q.file).filter(Boolean));

// Build file→group lookup from series-map
const groupByScreenshot = {};
seriesMap.forEach((g, i) => {
  groupByScreenshot[g.screenshot] = { ...g, _idx: i };
});

// Account targeting rules based on v2 classify fields
// Each account has preferred criteria, scored by match quality
const ACCOUNTS = [
  {
    account: '@nylondarling',
    target: 'elegant',
    match: (c) => {
      // Elegant: stockings or pantyhose, nude/sheer/beige, appeal 3-4
      if (['stockings', 'pantyhose'].includes(c.style) &&
          ['nude', 'sheer', 'beige', 'tan'].includes(c.nylon_color) &&
          c.sex_appeal >= 3) return 10;
      if (['stockings', 'pantyhose'].includes(c.style) &&
          ['nude', 'sheer', 'beige'].includes(c.nylon_color)) return 7;
      if (['stockings'].includes(c.style) && c.sex_appeal >= 3) return 4;
      return 0;
    }
  },
  {
    account: '@shinynylonstar',
    target: 'shiny-glossy',
    match: (c) => {
      // Shiny/glossy: catsuit, bodystocking, tights with black, appeal 3-4
      if (['catsuit', 'bodystocking'].includes(c.style) && c.nylon_color === 'black') return 10;
      if (['catsuit', 'bodystocking'].includes(c.style)) return 8;
      if (c.style === 'tights' && c.nylon_color === 'black' && c.sex_appeal >= 3) return 6;
      // Check vision description for shiny/glossy keywords
      const desc = (c.vision_description || '').toLowerCase();
      if (desc.includes('shiny') || desc.includes('glossy') || desc.includes('latex')) return 7;
      return 0;
    }
  },
  {
    account: '@legfashion',
    target: 'legs-focus',
    match: (c) => {
      // Legs focus: stockings or pantyhose, fishnet, appeal 2-3
      if (['stockings', 'pantyhose'].includes(c.style) && c.nylon_color === 'fishnet') return 10;
      if (['stockings', 'pantyhose', 'tights'].includes(c.style) && c.sex_appeal <= 3) return 6;
      // Check description for leg-focused keywords
      const desc = (c.vision_description || '').toLowerCase();
      if (desc.includes('legs') || desc.includes('crossed') || desc.includes('sitting')) return 5;
      return 0;
    }
  },
  {
    account: '@blackshinynylon',
    target: 'black-nylon',
    match: (c) => {
      // Black nylon: anything black, preference for tights/stockings, appeal 3-4
      if (c.nylon_color === 'black' && c.sex_appeal >= 4) return 10;
      if (c.nylon_color === 'black' && ['stockings', 'tights'].includes(c.style)) return 8;
      if (c.nylon_color === 'black') return 5;
      return 0;
    }
  },
  {
    account: '@nextdoornylon',
    target: 'lifestyle',
    match: (c) => {
      // Lifestyle/casual: tights or stockings, appeal 1-2, everyday vibes
      if (['tights', 'leggings'].includes(c.style) && c.sex_appeal <= 2) return 10;
      if (c.sex_appeal <= 2) return 7;
      // Check description for casual/outdoor keywords
      const desc = (c.vision_description || '').toLowerCase();
      if (desc.includes('casual') || desc.includes('street') || desc.includes('outdoor') || desc.includes('selfie')) return 6;
      if (['tights', 'knee-highs'].includes(c.style)) return 4;
      return 0;
    }
  },
  {
    account: '@nylongerie',
    target: 'editorial',
    match: (c) => {
      // Editorial: stockings, patterned or fishnet, appeal 3, professional vibe
      if (['stockings', 'pantyhose'].includes(c.style) && c.nylon_color === 'patterned') return 10;
      if (c.sex_appeal === 3 && ['stockings', 'pantyhose'].includes(c.style)) return 6;
      // Check description for editorial/professional keywords
      const desc = (c.vision_description || '').toLowerCase();
      if (desc.includes('editorial') || desc.includes('professional') || desc.includes('studio')) return 7;
      if (desc.includes('fashion') && c.sex_appeal <= 3) return 5;
      return 0;
    }
  },
  {
    account: '@planetnylon',
    target: 'other',
    match: (c) => {
      // Planet nylon: alternative, edgy, unusual styles
      if (['leggings', 'knee-highs', 'socks', 'bodysuit', 'other'].includes(c.style)) return 10;
      if (['red', 'blue', 'pink', 'patterned'].includes(c.nylon_color)) return 8;
      if (c.style === 'no legwear') return 3;
      return 0;
    }
  }
];

// Filter: valid handle, not already used, has image
const VALID_HANDLE_PATTERN = /^[a-zA-Z0-9_.]+$/;
const available = classified.filter(c =>
  c.handle &&
  c.handle.startsWith('@') &&
  c.handle.length > 3 &&
  !c.handle.includes('if visible') &&
  !c.handle.includes('else null') &&
  !c.handle.includes('username') &&
  VALID_HANDLE_PATTERN.test(c.handle.replace('@', '')) &&
  c.style !== 'error' &&
  c.style !== 'unknown' &&
  !usedFiles.has(c.screenshot)
);

console.log(`Total classified: ${classified.length}`);
console.log(`Available (not used, valid handle): ${available.length}`);
console.log(`Already in queue: ${usedFiles.size}\n`);

// Select best match per account (diversity: max 1 per handle)
const usedHandles = new Set();
const selected = [];

for (const acct of ACCOUNTS) {
  // Score all available
  const scored = available
    .filter(c => !usedHandles.has(c.handle))
    .map(c => ({ ...c, score: acct.match(c) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    console.warn(`⚠️  No candidates for ${acct.account} (${acct.target})`);
    continue;
  }

  // Check if any image from this group exists in inbox AND is not used
  const getAvailableImage = (group, screenshot) => {
    if (!group || !group.images) return null;
    // Find first image that exists in inbox AND is not used
    const available = group.images.find(img => 
      fs.existsSync(path.join(INBOX_DIR, img)) && !usedFiles.has(img)
    );
    return available || null;
  };
  
  // Pick from top 5 randomly (for variety)
  const topN = scored.slice(0, Math.min(5, scored.length));
  
  // Filter out picks where NO content image is available in inbox
  const eligiblePicks = topN.filter(pick => {
    const g = groupByScreenshot[pick.screenshot];
    const availableImage = getAvailableImage(g, pick.screenshot);
    return availableImage !== null; // Only pass if there's an available image
  });
  
  if (eligiblePicks.length === 0) {
    console.warn(`⚠️  All top picks for ${acct.account} have used images, skipping`);
    continue;
  }
  
  const pick = eligiblePicks[Math.floor(Math.random() * eligiblePicks.length)];

  // Find best image file: use the available image we already checked, fallback to screenshot
  const group = groupByScreenshot[pick.screenshot];
  let imageFile = getAvailableImage(group, pick.screenshot) || pick.screenshot;

  selected.push({
    file: imageFile,
    screenshot: pick.screenshot,
    handle: pick.handle,
    account: acct.account,
    style: acct.target,
    v2_style: pick.style,
    v2_color: pick.nylon_color,
    v2_appeal: pick.sex_appeal,
    description: pick.vision_description,
    score: pick.score
  });

  usedHandles.add(pick.handle);

  // Remove from available
  const idx = available.findIndex(a => a.screenshot === pick.screenshot);
  if (idx >= 0) available.splice(idx, 1);
}

// Output
console.log(`Selected: ${selected.length}/7\n`);
selected.forEach((s, i) => {
  console.log(`${i + 1}. ${s.account.padEnd(20)} | ${s.handle.padEnd(25)} | ${s.v2_style}/${s.v2_color} | appeal:${s.v2_appeal} | score:${s.score} | ${s.file}`);
});

fs.writeFileSync(OUTPUT, JSON.stringify(selected, null, 2));
console.log(`\n✅ Saved to ${OUTPUT}`);
