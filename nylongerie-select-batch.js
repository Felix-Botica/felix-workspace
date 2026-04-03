#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CLASSIFY = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results.json');
const QUEUE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');

// Read classified images
const classified = JSON.parse(fs.readFileSync(CLASSIFY, 'utf8'));

// Read queue (create if missing)
let queue = [];
if (fs.existsSync(QUEUE)) {
  queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
}
const usedFiles = new Set(queue.map(q => q.file).filter(Boolean));

// Invalid handle patterns
const INVALID_HANDLES = new Set(['@username', '@null', '@unknown', '@undefined', '@none']);

function isValidHandle(handle) {
  if (!handle || typeof handle !== 'string') return false;
  if (!handle.startsWith('@')) return false;
  if (INVALID_HANDLES.has(handle.toLowerCase())) return false;
  // Must have @ followed by at least 3 chars (letters, digits, dots, underscores)
  return /^@[\w.]{3,}$/.test(handle);
}

// Filter: content type, valid handle, not already used
const available = classified.filter(c =>
  c.type === 'content' &&
  isValidHandle(c.handle) &&
  !usedFiles.has(c.file)
);

// Style → Account mapping
const styleMap = {
  'elegant':        '@nylondarling',
  'shiny-glossy':   '@shinynylonstar',
  'legs-focus':     '@legfashion',
  'black-nylon':    '@blackshinynylon',
  'lifestyle':      '@nextdoornylon',
  'girl-next-door': '@nextdoornylon',
  'housewife':      '@nextdoornylon',
  'editorial':      '@nylongerie',
  'other':          '@planetnylon',
  'product':        '@planetnylon',
};

// 7 target accounts, 1 post each
const targets = [
  { account: '@nylondarling',    styles: ['elegant'] },
  { account: '@shinynylonstar',  styles: ['shiny-glossy'] },
  { account: '@legfashion',      styles: ['legs-focus'] },
  { account: '@blackshinynylon', styles: ['black-nylon'] },
  { account: '@nextdoornylon',   styles: ['lifestyle', 'girl-next-door', 'housewife'] },
  { account: '@nylongerie',      styles: ['editorial'] },
  { account: '@planetnylon',     styles: ['other', 'product'] },
];

// Select one image per target account (max 2 per handle for diversity)
const MAX_PER_HANDLE = 2;
const handleCount = {};
const selected = [];

for (const target of targets) {
  const candidates = available
    .filter(c => target.styles.includes(c.style))
    .filter(c => (handleCount[c.handle] || 0) < MAX_PER_HANDLE);

  if (candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    selected.push({
      file: pick.file,
      handle: pick.handle,
      account: target.account,
      style: pick.style,
      description: pick.description,
    });
    handleCount[pick.handle] = (handleCount[pick.handle] || 0) + 1;
    const idx = available.indexOf(pick);
    available.splice(idx, 1);
  } else {
    // Fallback: ignore handle limit if no diverse candidates
    const fallback = available.filter(c => target.styles.includes(c.style));
    if (fallback.length > 0) {
      const pick = fallback[Math.floor(Math.random() * fallback.length)];
      selected.push({
        file: pick.file,
        handle: pick.handle,
        account: target.account,
        style: pick.style,
        description: pick.description,
      });
      handleCount[pick.handle] = (handleCount[pick.handle] || 0) + 1;
      const idx = available.indexOf(pick);
      available.splice(idx, 1);
    } else {
      console.warn(`No candidates for ${target.account} (${target.styles.join(', ')})`);
    }
  }
}

// Summary
console.log(`Available: ${available.length + selected.length} images`);
console.log(`Selected: ${selected.length}/7\n`);
console.log(JSON.stringify(selected, null, 2));
