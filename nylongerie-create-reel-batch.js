#!/usr/bin/env node
/**
 * nylongerie-create-reel-batch.js
 *
 * Selects reels with verified handles, uploads videos to R2,
 * generates captions, and creates queue entries with type: 'reel'.
 *
 * Usage:
 *   node nylongerie-create-reel-batch.js                     # auto-select reels
 *   node nylongerie-create-reel-batch.js --count 3           # select 3 reels
 *   node nylongerie-create-reel-batch.js --file reel.mp4     # specific reel
 *   node nylongerie-create-reel-batch.js --dry-run           # preview only
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.env.HOME, '.openclaw', '.env'), override: true });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Config
const BASE = path.join(process.env.HOME, '.openclaw', 'nylongerie');
const CLASSIFY_FILE = path.join(BASE, 'classify-results.json');
const QUEUE_FILE = path.join(BASE, 'queue.json');
const USED_FILE = path.join(BASE, 'used-images.json');
const INBOX = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_FILE = (() => {
  const idx = process.argv.indexOf('--file');
  return idx >= 0 ? process.argv[idx + 1] : null;
})();
const COUNT = (() => {
  const idx = process.argv.indexOf('--count');
  return idx >= 0 ? parseInt(process.argv[idx + 1], 10) : 7;
})();

const PLACEHOLDERS = new Set([
  '@username', '@handle if visible else null', '@username or null',
  '@handle_visible', '@username_here', '@null', '@username_not_visible',
  '@username_or_null', '@handle_if_visible_else_null',
  '@handle_not_visible_in_image', '@brand_name'
]);

function isRealHandle(h) {
  return h && !PLACEHOLDERS.has(h) && h !== 'null' && /^@[\w.]+/.test(h);
}

// Refactor C (2026-04-22): PAUSED_ACCOUNTS + active account list + style routing
// all come from config/nylongerie.json (SSOT). No hardcoded lists.
const { loadConfig, activeAccounts } = require(require('path').join(process.env.HOME, '.openclaw/lib/config'));
const { PAUSED_ACCOUNTS, assertNoPausedIn } = require(require('path').join(process.env.HOME, '.openclaw/lib/paused_accounts'));

const CONFIG = loadConfig();
// Build ACCOUNT_STYLES dict from config.accounts.active, mapping "@handle" →
// style_tags array. This keeps reel routing in lockstep with the SSOT.
const ACCOUNT_STYLES = Object.fromEntries(
  activeAccounts().map(a => [`@${a.handle}`, a.style_tags || []])
);
assertNoPausedIn(Object.keys(ACCOUNT_STYLES).map(k => k.replace('@','')), 'reel ACCOUNT_STYLES');

// Rotation order: reels without a matching style rotate through these accounts
// round-robin, rather than piling up on @nylondarling. Excludes paused accounts.
// Previously: all style-unmatched reels defaulted to @nylondarling, which caused
// over-posting on the flagship account. Fixed 2026-04-21.
const ROTATION_ACCOUNTS = Object.freeze(
  Object.keys(ACCOUNT_STYLES).filter(a => !PAUSED_ACCOUNTS.includes(a.replace('@','').toLowerCase()))
);
const ROTATION_STATE_FILE = path.join(BASE, 'reel-rotation-state.json');

function nextRotationAccount() {
  let state = { index: 0 };
  try { state = JSON.parse(fs.readFileSync(ROTATION_STATE_FILE, 'utf8')); } catch {}
  const idx = (Number.isFinite(state.index) ? state.index : 0) % ROTATION_ACCOUNTS.length;
  const acct = ROTATION_ACCOUNTS[idx];
  // Persist the next index atomically (best-effort).
  try {
    fs.writeFileSync(ROTATION_STATE_FILE, JSON.stringify({ index: (idx + 1) % ROTATION_ACCOUNTS.length, last_account: acct, last_rotated_at: new Date().toISOString() }, null, 2));
  } catch(e) { /* non-fatal */ }
  return acct;
}

function routeToAccount(style) {
  // Style-match first (preserves per-niche routing when classification is confident).
  if (style) {
    for (const [account, styles] of Object.entries(ACCOUNT_STYLES)) {
      if (styles.includes(style)) {
        if (PAUSED_ACCOUNTS.includes(account.replace('@','').toLowerCase())) continue; // skip paused
        return account;
      }
    }
  }
  // Fallback: round-robin across non-paused accounts instead of always @nylondarling.
  return nextRotationAccount();
}

// Caption templates (reels get same captions as posts)
const CAPTIONS = {
  '@nylondarling': (headline, handle) => `nylondarling ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ the stunning ${handle.replace('@', '')} ${handle}\n🌹\nIntroduced by Nylon Darling™ @nylondarling\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nNylon Darling™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @nylondarling and #nylondarling\n\n#nylondarling #legfashion #nylongerie #classynylons #nyloncherie #fashiontights #tightsfashion #legscrossed #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #nylonlovers #instanylons #tightsblogger #crossedlegs #tights #pantyhose #collant #calze #pantyhosemodel #pantyhoselegs #rajstopy #tightslover #stockings #instaheels #iloveheels #reels\n\n· Nylon Darling™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S. @nyloncherie\n□ Follow @legfashion @shinynylonstar @nylondarling`,

  '@legfashion': (headline, handle) => `legfashion ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n🦵\nFeatured by Leg Fashion™ @legfashion\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nLeg Fashion™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @legfashion and #legfashion\n\n#legfashion #nylondarling #nylongerie #nyloncherie #classynylons #fashiontights #tightsfashion #legscrossed #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #pantyhoselegs #stockings #instaheels #reels\n\n· Leg Fashion™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @nyloncherie @shinynylonstar`,

  '@shinynylonstar': (headline, handle) => `shinynylonstar ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n✨\nFeatured by Shiny Nylon Star™ @shinynylonstar\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nShiny Nylon Star™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @shinynylonstar and #shinynylonstar\n\n#shinynylonstar #nylondarling #legfashion #nylongerie #nyloncherie #glossy #shiny #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #latex #glossylegs #reels\n\n· Shiny Nylon Star™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @nyloncherie @legfashion`,

  '@blackshinynylon': (headline, handle) => `blackshinynylon ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n🖤\nFeatured by Black Shiny Nylon™ @blackshinynylon\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nBlack Shiny Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @blackshinynylon and #blackshinynylon\n\n#blackshinynylon #nylondarling #legfashion #nylongerie #black #shiny #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #reels\n\n· Black Shiny Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @legfashion @shinynylonstar`,

  '@nextdoornylon': (headline, handle) => `nextdoornylon ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n🌸\nFeatured by Nextdoor Nylon™ @nextdoornylon\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nNextdoor Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @nextdoornylon and #nextdoornylon\n\n#nextdoornylon #nylondarling #legfashion #nylongerie #casual #lifestyle #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #reels\n\n· Nextdoor Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @legfashion @shinynylonstar`,

  '@nylongerie': (headline, handle) => `nylongerie ■ Shop Nylongerie.com\n${headline} ★ ${handle}\n🛍️\nFeatured by Nylongerie® @nylongerie\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nNylongerie® legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @nylongerie and #nylongerie\n\n#nylongerie #nylondarling #legfashion #classynylons #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #editorial #fashionphotography #reels\n\n· Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @legfashion @shinynylonstar`,

  '@planetnylon': (headline, handle) => `planetnylon ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n🌍\nFeatured by Planet Nylon™ @planetnylon\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nPlanet Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @planetnylon and #planetnylon\n\n#planetnylon #nylondarling #legfashion #nylongerie #edgy #alternative #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #reels\n\n· Planet Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @legfashion @shinynylonstar`
};

function generateHeadline(style) {
  const headlines = {
    'editorial': 'Fashion in motion',
    'lifestyle': 'Real-life style',
    'elegant': 'Timeless elegance',
    'shiny-glossy': 'Glossy perfection',
    'legs-focus': 'Legs in motion',
    'black': 'Dark elegance',
    'casual': 'Everyday chic',
    'edgy': 'Bold statement',
  };
  return headlines[style] || 'Style in motion';
}

// R2 Upload
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function uploadVideoToR2(filePath, key) {
  const body = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.mov' ? 'video/quicktime' : 'video/mp4';

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

// Select reels for batch
function selectReels(count) {
  const RETENTION_DAYS = 90;
  const results = JSON.parse(fs.readFileSync(CLASSIFY_FILE, 'utf8'));
  const used = JSON.parse(fs.readFileSync(USED_FILE, 'utf8'));
  const queue = fs.existsSync(QUEUE_FILE) ? JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')) : [];
  const queuedFiles = new Set(queue.map(e => e.file));

  // For reels: block if already used on the same account within 90 days.
  // Same logic as nylongerie-select-v3.js (90-day retention, same-account blocking).
  const now = new Date();
  const blockedReels = {}; // file -> Set of accounts it's already been posted to (within 90 days)
  for (const [file, entry] of Object.entries(used)) {
    if (file.startsWith('_')) continue;
    if (!entry.used_date || entry.type !== 'reel') continue;
    const expiry = new Date(entry.used_date);
    expiry.setDate(expiry.getDate() + RETENTION_DAYS);
    if (now >= expiry) continue; // not blocked, past 90 days
    if (!blockedReels[file]) blockedReels[file] = new Set();
    for (const acct of (entry.accounts || [])) {
      blockedReels[file].add(acct);
    }
  }

  // Filter: reels with real handles, not blocked for the account they'd be routed to, not queued, file exists
  const candidates = results.filter(e => {
    if (e.type !== 'reel') return false;
    if (!isRealHandle(e.handle)) return false;
    if (!fs.existsSync(path.join(INBOX, e.file))) return false;
    if (queuedFiles.has(e.file)) return false;
    const targetAccount = routeToAccount(e.style || '').replace('@', '');
    if (blockedReels[e.file] && blockedReels[e.file].has(targetAccount)) return false;
    return true;
  });

  console.log(`   Reel candidates: ${candidates.length}`);

  // Deduplicate by handle — max 1 reel per model per batch
  const usedHandles = new Set();
  const selected = [];

  // Shuffle for variety
  const shuffled = candidates.sort(() => Math.random() - 0.5);

  for (const reel of shuffled) {
    if (selected.length >= count) break;
    if (usedHandles.has(reel.handle)) continue;

    // Skip very short (<3s) or very long (>90s) reels
    if (reel.duration_seconds && (reel.duration_seconds < 3 || reel.duration_seconds > 90)) continue;

    usedHandles.add(reel.handle);
    selected.push(reel);
  }

  return selected;
}

async function createReelBatch() {
  console.log(`\n🎬 Reel Batch Creator`);
  console.log(`   Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🔴 LIVE'}\n`);

  let reels;

  if (SPECIFIC_FILE) {
    const results = JSON.parse(fs.readFileSync(CLASSIFY_FILE, 'utf8'));
    const reel = results.find(e => e.file === SPECIFIC_FILE && e.type === 'reel');
    if (!reel) {
      console.error(`❌ Reel not found: ${SPECIFIC_FILE}`);
      process.exit(1);
    }
    reels = [reel];
  } else {
    reels = selectReels(COUNT);
  }

  console.log(`   Selected ${reels.length} reels for batch\n`);

  if (reels.length === 0) {
    console.log('❌ No eligible reels found.');
    return;
  }

  const queue = fs.existsSync(QUEUE_FILE) ? JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')) : [];
  const used = JSON.parse(fs.readFileSync(USED_FILE, 'utf8'));
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const drafts = [];

  for (let i = 0; i < reels.length; i++) {
    const reel = reels[i];
    const account = routeToAccount(reel.style);
    const headline = generateHeadline(reel.style);
    const captionFn = CAPTIONS[account];
    const caption = captionFn(headline, reel.handle);

    console.log(`🎥 ${reel.file}`);
    console.log(`   Model: ${reel.handle}`);
    console.log(`   Account: ${account}`);
    console.log(`   Duration: ${reel.duration_seconds || '?'}s`);

    let videoUrl = null;
    if (!DRY_RUN) {
      const inputPath = path.join(INBOX, reel.file);
      const r2Key = `reels/${today}-${reel.handle.replace('@', '')}-${reel.file}`;
      console.log(`   Uploading to R2...`);
      videoUrl = await uploadVideoToR2(inputPath, r2Key);
      console.log(`   URL: ${videoUrl}`);
    } else {
      videoUrl = `https://example.com/reels/${reel.file}`;
      console.log(`   [DRY RUN] Would upload to R2`);
    }

    const draft = {
      id: `reel-${today}-${i + 1}`,
      type: 'reel',
      file: reel.file,
      model: reel.handle,
      account: account,
      status: 'draft_sent',
      created: new Date().toISOString(),
      preview_url: videoUrl,
      video_url: videoUrl,
      caption_headline: headline,
      caption: caption,
      duration_seconds: reel.duration_seconds || null
    };

    drafts.push(draft);

    if (!DRY_RUN) {
      queue.push(draft);
      used[reel.file] = {
        used_date: new Date().toISOString().slice(0, 10),
        accounts: [account.replace('@', '')],
        type: 'reel',
        status: 'draft_sent'
      };
    }

    console.log(`   ✅ Draft: ${draft.id}\n`);
  }

  if (!DRY_RUN) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    fs.writeFileSync(USED_FILE, JSON.stringify(used, null, 2));
    console.log(`💾 Queue updated (${queue.length} entries)`);
    console.log(`💾 Used-images updated`);
  }

  console.log(`\n📊 BATCH SUMMARY`);
  console.log(`   Reels created: ${drafts.length}`);
  drafts.forEach(d => console.log(`   ${d.id}: ${d.file} → ${d.account} (${d.model})`));

  // Output JSON for downstream use
  console.log('\n' + JSON.stringify(drafts, null, 2));
}

createReelBatch().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
