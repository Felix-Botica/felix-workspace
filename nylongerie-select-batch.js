#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CLASSIFY = '~/.openclaw/nylongerie/classify-results.json'.replace('~', process.env.HOME);
const QUEUE = '~/.openclaw/nylongerie/queue.json'.replace('~', process.env.HOME);

// Read files
const classified = JSON.parse(fs.readFileSync(CLASSIFY, 'utf8'));
const queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));

// Extract already used files
const usedFiles = new Set(queue.map(q => q.file).filter(Boolean));

// Filter: clean handle, not used, content type
const available = classified.filter(c => 
  c.type === 'content' &&
  c.handle && c.handle !== 'null' && c.handle.startsWith('@') &&
  !usedFiles.has(c.file)
);

// Style-to-account mapping (excluding @nyloncherie)
const styleMap = {
  'elegant': '@nylondarling',
  'legs-focus': '@legfashion',
  'shiny-glossy': '@shinynylonstar',
  'black': '@blackshinynylon',
  'edgy': '@planetnylon',
  'casual': '@nextdoornylon',
  'lifestyle': '@nextdoornylon'
};

// Target accounts for today's batch
const targets = [
  { account: '@nylondarling', style: 'elegant' },
  { account: '@shinynylonstar', style: 'shiny-glossy' },
  { account: '@legfashion', style: 'legs-focus' },
  { account: '@blackshinynylon', style: 'black' },
  { account: '@nextdoornylon', style: 'lifestyle' }
];

// Select one image per target
const selected = [];
for (const target of targets) {
  const candidates = available.filter(c => c.style === target.style && styleMap[c.style] === target.account);
  if (candidates.length > 0) {
    const pick = candidates[0];
    selected.push({
      file: pick.file,
      handle: pick.handle,
      account: target.account,
      style: pick.style,
      description: pick.description
    });
    // Remove from available to avoid duplicates
    const idx = available.indexOf(pick);
    available.splice(idx, 1);
  } else {
    console.warn(`No candidates for ${target.account} (${target.style})`);
  }
}

console.log(JSON.stringify(selected, null, 2));
