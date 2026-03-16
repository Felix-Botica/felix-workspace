# NYLONGERIE_PIPELINE.md — Instagram Posting Pipeline

## Overview
Complete workflow for posting nylon/hosiery fashion content to 5 Instagram accounts.

## ⚡ Topic 3 Context Rule
When Felix receives a message in **Topic 3 (NylonGerie)**, ALWAYS check `~/.openclaw/nylongerie/queue.json` for entries with `status: "draft_sent"` before responding. This ensures context survives session resets — no more "which images?" confusion. Display pending drafts with their preview URLs so Lothar can approve/reject immediately.

## Accounts
| Account | IG ID | Style |
|---------|-------|-------|
| @nylondarling | 17841429713561331 | Lifestyle/editorial, flagship |
| @nyloncherie | 17841402906657029 | Classic/elegant |
| @nylongerie | 17841402986367027 | Brand hub, product links |
| @legfashion | 17841402884847036 | Legs-focused |
| @shinynylonstar | 17841464191117228 | Shiny/glossy niche |

## Content Sources
- **Inbox:** `~/Desktop/nylongerie-content/inbox/` (raw images + videos)
- **Queue:** `~/.openclaw/nylongerie/queue.json` (tracking all posts)
- **Classifications:** `~/.openclaw/nylongerie/classify-results.json` (AI-categorized)

## Style → Account Mapping
- `elegant` → @nylondarling (was @nyloncherie — paused indefinitely since 09.03.2026)
- `lifestyle` → @nylondarling
- `shiny-glossy` → @shinynylonstar
- `legs-focus` → @legfashion
- Product shots → @nylongerie
- ⚠️ **@nyloncherie ist PAUSIERT** — keine Posts bis auf Weiteres

## Pipeline Steps

### 1. Pick an Image
- Check `classify-results.json` for categorized content with `handle` (credit) available
- Prioritize images WITH credit over unknown sources
- Copy to workspace: `cp ~/Desktop/nylongerie-content/inbox/{file} ~/.openclaw/workspace/temp-src.jpg`

### 2. Image Preparation
**NO text overlay on the image!** The image stays clean/pure — respect the model.
All branding, CTA, and credit goes into the CAPTION only.

Only use Sharp for resizing/quality optimization if needed, NOT for overlays.

### OLD (DEPRECATED): Build CTA Overlay (Sharp) — DO NOT USE
```javascript
cd ~/.openclaw && node -e "
const sharp = require('sharp');
const path = require('path');

const inputFile = process.env.HOME + '/.openclaw/workspace/temp-src.jpg';
const outputFile = process.env.HOME + '/.openclaw/workspace/preview-post.jpg';

async function createOverlay(headline, credit) {
  const img = sharp(inputFile);
  const meta = await img.metadata();
  const w = meta.width;
  const h = meta.height;
  
  const gradientHeight = Math.round(h * 0.25);
  const gradient = Buffer.from(
    '<svg width=\"' + w + '\" height=\"' + h + '\">' +
    '<defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">' +
    '<stop offset=\"0\" stop-color=\"black\" stop-opacity=\"0\"/>' +
    '<stop offset=\"0.4\" stop-color=\"black\" stop-opacity=\"0.3\"/>' +
    '<stop offset=\"1\" stop-color=\"black\" stop-opacity=\"0.85\"/>' +
    '</linearGradient></defs>' +
    '<rect x=\"0\" y=\"' + (h - gradientHeight) + '\" width=\"' + w + '\" height=\"' + gradientHeight + '\" fill=\"url(#g)\"/>' +
    '</svg>'
  );
  
  const fontSize1 = Math.round(w * 0.045);
  const fontSize2 = Math.round(w * 0.022);
  const fontSize3 = Math.round(w * 0.02);
  const textY1 = h - Math.round(gradientHeight * 0.45);
  const textY2 = textY1 + fontSize1 + 10;
  const textY3 = textY2 + fontSize2 + 8;
  
  const textSvg = Buffer.from(
    '<svg width=\"' + w + '\" height=\"' + h + '\">' +
    '<text x=\"' + w/2 + '\" y=\"' + textY1 + '\" text-anchor=\"middle\" font-family=\"Georgia, serif\" font-style=\"italic\" font-size=\"' + fontSize1 + '\" fill=\"white\" opacity=\"0.95\">' + headline + '</text>' +
    '<text x=\"' + w/2 + '\" y=\"' + textY2 + '\" text-anchor=\"middle\" font-family=\"Helvetica, Arial, sans-serif\" font-size=\"' + fontSize2 + '\" fill=\"white\" opacity=\"0.8\" letter-spacing=\"3\">SHOP THE LOOK • LINK IN BIO</text>' +
    '<text x=\"' + w/2 + '\" y=\"' + textY3 + '\" text-anchor=\"middle\" font-family=\"Helvetica, Arial, sans-serif\" font-size=\"' + fontSize3 + '\" fill=\"white\" opacity=\"0.6\">' + credit + '</text>' +
    '</svg>'
  );
  
  await sharp(inputFile)
    .composite([
      { input: gradient, blend: 'over' },
      { input: textSvg, blend: 'over' }
    ])
    .jpeg({ quality: 92 })
    .toFile(outputFile);
  
  console.log('Done:', outputFile);
}

createOverlay('HEADLINE_HERE', '@credit_here').catch(e => console.error(e));
"
```

### 3. Upload to R2 for Preview
```javascript
cd ~/.openclaw && node -e "
require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function upload(localPath, r2Key) {
  const file = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: r2Key,
    Body: file,
    ContentType: 'image/jpeg'
  }));
  console.log(process.env.R2_PUBLIC_URL + '/' + r2Key);
}

upload(
  process.env.HOME + '/.openclaw/workspace/preview-post.jpg',
  'preview/FILENAME.jpg'
).catch(e => console.error(e));
"
```

### Caption Template (per Account)

#### @nylondarling
```
nylondarling ■ Shop @nylongerie ♡ Nylongerie.com
{HEADLINE} ★ the stunning {MODEL_NAME} @{MODEL_HANDLE}
🌹
Introduced by Nylon Darling™ @nylondarling
•
Copyright © {MODEL_NAME}, {YEAR}
Nylon Darling™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @nylondarling and #nylondarling

#nylondarling #legfashion #nylongerie #classynylons #nyloncherie #fashiontights #tightsfashion #legscrossed #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #nylonlovers #instanylons #tightsblogger #crossedlegs #tights #pantyhose #collant #calze #pantyhosemodel #pantyhoselegs #rajstopy #tightslover #stockings #instaheels #iloveheels

· Nylon Darling™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S. @nyloncherie
□ Follow @legfashion @shinynylonstar @nylondarling
```

#### @nyloncherie
```
nyloncherie ■ Shop @nylongerie ♡ Nylongerie.com
{HEADLINE} ★ @{MODEL_HANDLE}
🌹
Featured by Nylon Chérie™ @nyloncherie
•
Copyright © {MODEL_NAME}, {YEAR}
Nylon Chérie™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @nyloncherie and #nyloncherie

#nyloncherie #nylondarling #legfashion #nylongerie #classynylons #elegance #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tightsblogger #tights #pantyhose #collant #calze #pantyhosemodel #stockings #instaheels

· Nylon Chérie™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.
□ Follow @nylondarling @legfashion @shinynylonstar
```

#### @legfashion
```
legfashion ■ Shop @nylongerie ♡ Nylongerie.com
{HEADLINE} ★ @{MODEL_HANDLE}
🦵
Featured by Leg Fashion™ @legfashion
•
Copyright © {MODEL_NAME}, {YEAR}
Leg Fashion™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @legfashion and #legfashion

#legfashion #nylondarling #nylongerie #nyloncherie #classynylons #fashiontights #tightsfashion #legscrossed #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #pantyhoselegs #stockings #instaheels

· Leg Fashion™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.
□ Follow @nylondarling @nyloncherie @shinynylonstar
```

#### @shinynylonstar
```
shinynylonstar ■ Shop @nylongerie ♡ Nylongerie.com
{HEADLINE} ★ @{MODEL_HANDLE}
✨
Featured by Shiny Nylon Star™ @shinynylonstar
•
Copyright © {MODEL_NAME}, {YEAR}
Shiny Nylon Star™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @shinynylonstar and #shinynylonstar

#shinynylonstar #nylondarling #legfashion #nylongerie #nyloncherie #glossy #shiny #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #latex #glossylegs

· Shiny Nylon Star™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.
□ Follow @nylondarling @nyloncherie @legfashion
```

### 4. Send Preview to Lothar via WhatsApp
Use `message(action=send, to="+491759959766", media=R2_URL, message="...")` with:
- Account name
- Proposed caption
- 👍 / ✏️ / ❌ options

### 5. Publish to Instagram
After Lothar approves:
- Update queue.json entry with `account`, `caption`, `status: "approved"`
- Run: `node ~/.openclaw/workspace/nylongerie-publish.js {post_id}`
- Or publish directly via Instagram Graph API
- ⚠️ **Use graph.facebook.com** (NOT graph.instagram.com) — system user tokens require Facebook Graph endpoint

## Scripts
- **Classify:** `~/.openclaw/workspace/nylongerie-classify-local.js` (AI image classification)
- **Publish:** `~/.openclaw/workspace/nylongerie-publish.js` (R2 upload + Instagram API)

## Rules
- **One photo, one account** — no cross-posting the same image
- **Always get Lothar's approval** before posting
- **🔴 KEIN POST OHNE CREDIT** — Model muss gewürdigt werden: Handle im Bild (CTA overlay) + im Caption getaggt. Bilder ohne bekannten Handle werden NICHT gepostet.
- **Rate limits:** 200 API calls/hour/account, 25 posts/day/account
- **R2 Public URL:** Stored in R2_PUBLIC_URL env var

## Selecting Content
Filter classify-results.json for entries with REAL handles only:
- Exclude: null, none, "handle if visible else null", and similar placeholders
- Test: handle must match /^[a-zA-Z0-9_.]+$/ after stripping @ prefix
- Only use `type: "content"` images (not screenshots)

### Series Linking (fixed 2026-03-06)
Images come in series: Screenshot (with visible handle) + Content images (the actual photos).
Series linking propagates the handle from screenshots to adjacent content images.
- **model-series.json** — index of 160 model series with file lists
- Linked entries have `linkedFrom` field pointing to the source screenshot

### Current Stats (after series linking)
- Total classified: 1,331
- Screenshots: 562 | Content: 769 | Reels: 253
- **Postable content with credit: 522** (from 205 unique models)
- By style:
  - editorial → @nylondarling: 171
  - lifestyle → @nylondarling: 210
  - elegant → @nyloncherie: 66
  - legs-focus → @legfashion: 25
  - casual: 30
  - shiny-glossy → @shinynylonstar: 6
  - other: 14

## Environment Variables (in ~/.openclaw/.env)
- META_ACCESS_TOKEN — Instagram Graph API token (permanent)
- R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL — Cloudflare R2
