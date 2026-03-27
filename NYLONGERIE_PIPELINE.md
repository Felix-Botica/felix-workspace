# NYLONGERIE_PIPELINE.md — Instagram Posting Pipeline

## Overview
Complete workflow for posting nylon/hosiery fashion content to 5 Instagram accounts.

## ⚡ Topic 3 Context Rule
When Felix receives a message in **Topic 3 (NylonGerie)**, ALWAYS check `~/.openclaw/nylongerie/queue.json` for entries with `status: "draft_sent"` before responding. This ensures context survives session resets — no more "which images?" confusion. Display pending drafts with their preview URLs so Lothar can approve/reject immediately.

## Accounts
| Account | IG ID | Style | Followers |
|---------|-------|-------|-----------|
| @nylondarling | 17841429713561331 | Lifestyle/editorial, flagship | 254K |
| @nyloncherie | 17841402906657029 | Classic/elegant (PAUSED) | 58K |
| @nylongerie | 17841402986367027 | Brand hub, product links | 46K |
| @legfashion | 17841402884847036 | Legs-focused | 46K |
| @shinynylonstar | 17841464191117228 | Shiny/glossy niche | 33K |
| @blackshinynylon | 17841471823236920 | Dark/black nylon aesthetic | 7.5K |
| @planetnylon | 17841472009081615 | Edgy: leather, vinyl, boots | 2K |
| @nextdoornylon | 17841472299535162 | Girl-next-door, casual, natural | 4.5K |

## Content Sources
- **Inbox:** `~/Desktop/nylongerie-content/inbox/` (raw images + videos)
- **Queue:** `~/.openclaw/nylongerie/queue.json` (tracking all posts)
- **Classifications:** `~/.openclaw/nylongerie/classify-results.json` (AI-categorized)

## Stories Template Engine
- **File:** `~/.openclaw/nylongerie/story-templates.js`
- **Version:** v3 (Font-Fix update 20.03.2026)
- **Templates:** sale, product, motw, season, category
- **Fonts:** DancingScript (script headlines), Montserrat + Bold + ExtraBold
- **Font Rules (MANDATORY):**
  - Minimum font size: **30px** — nothing smaller, ever
  - All Montserrat text: **bold** weight
  - DancingScript: always with **4px stroke outline** for phone readability
  - CTA: **52px bold** with semi-transparent **background box**
  - Code pill: **44px bold**, **4px border**
  - Branding: **32px bold**, opacity 0.7, with text shadow
  - **Link sticker zone:** ~220px gap between CTA and branding (CTA ends ~1580, branding at ~1780)

## ⚠️ Stories: NIEMALS via API publishen!
Instagram API unterstützt KEINE Link-Sticker. Stories IMMER manuell via App posten.
**Felix' Workflow:**
1. Story-Bild generieren + auf R2 hochladen
2. Link an Lothar schicken in Topic 3
3. Lothar published manuell in der App + fügt Link-Sticker ein
4. **NICHT `media_publish` mit `media_type=STORIES` aufrufen!**

## Style → Account Mapping
- `elegant` → @nylondarling (was @nyloncherie — paused indefinitely since 09.03.2026)
- `lifestyle` → @nylondarling
- `editorial` → @nylondarling
- `shiny-glossy` → @shinynylonstar
- `legs-focus` → @legfashion
- `black` (black nylons, dark aesthetic) → @blackshinynylon
- `casual` / `girl-next-door` (natural, authentic, casual, real) → @nextdoornylon
- Product shots → @nylongerie
- `edgy` (shiny + leather, vinyl, latex, boots, heels) → @planetnylon
- ⚠️ **@nyloncherie ist PAUSIERT** — keine Posts bis auf Weiteres

## Daily Batch (nylongerie-daily-batch, 10:00 CET)
**Besteht aus 2 Teilen:**

### A) 5 Posts/Tag
- Across 7 active accounts (nyloncherie paused)
- Rotation ensures each account gets regular content
- Priority weighting: @nylondarling (daily), @legfashion (4x/week), rest (2-3x/week)
- Morning batch proposal in Topic 3 for approval
- ⚠️ **@nyloncherie ist PAUSIERT** — keine Posts bis auf Weiteres

### B) 1 Story/Tag
- **Identische Story** wird bei 3 der 8 Accounts gepostet (Rotation oder Top-3)
- **⚠️ MUSS manuell von Lothar gepostet werden** — API kann keine Link-Sticker!
- **Bild MUSS ein Shopify-Produktbild sein** (aus Shopify Admin API, KEIN Content-Bild aus inbox — Copyright!)
- Felix generiert Story-Bild + lädt auf R2 hoch + schickt Link in Topic 3

### Story-Typen (Mix!)
1. **Product Stories** — Direkte Produkt-Promotion mit Rabattcode/Bundle-Angebot
2. **Newsletter Stories** — CTA zielt auf Newsletter-Anmeldung ("15% Rabatt für Subscriber!", "Join our VIP list")
   - Newsletter-Subscriber convertieren am besten → strategisch wichtig!
- **Verhältnis:** ~60% Product / 40% Newsletter (abwechselnd)

## Pipeline Steps

### 1. Pick an Image
- Check `classify-results.json` for categorized content with `handle` (credit) available
- Prioritize images WITH credit over unknown sources
- Copy to workspace: `cp ~/Desktop/nylongerie-content/inbox/{file} ~/.openclaw/workspace/temp-src.jpg`

### 2. Image Preparation
**NO text overlay on the image!** The image stays clean/pure — respect the model.
All branding, CTA, and credit goes into the CAPTION only.

Only use Sharp for resizing/quality optimization if needed, NOT for overlays.

**⚠️ MANDATORY: Auto-crop white bars (screenshot artifacts) BEFORE any processing!**
Many inbox images are phone screenshots with white UI bars at top/bottom.
Always scan and remove white strips (avg brightness > 235) before cropping to aspect ratio.

**⚠️ MANDATORY: Crop to 4:5 (1080×1350) before uploading to IG!**
Instagram rejects images with unsupported aspect ratios (error 36003).
Always use Sharp with extract + resize to enforce 4:5:
```javascript
sharp(path).metadata().then(meta => {
    const ratio = 4/5;
    let cropW, cropH;
    if (meta.width / meta.height > ratio) {
        cropH = meta.height; cropW = Math.round(meta.height * ratio);
    } else {
        cropW = meta.width; cropH = Math.round(meta.width / ratio);
    }
    return sharp(path)
      .extract({ left: Math.round((meta.width-cropW)/2), top: Math.round((meta.height-cropH)/2), width: cropW, height: cropH })
      .resize(1080, 1350).jpeg({ quality: 90 }).toFile(outputPath);
});
```

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

### 4. Send Preview to Lothar for Approval
Send drafts to **Telegram Felix HQ → Approvals (Topic 6)** (chat: -1003775282698, topic: 6).
Use `message(action=send, target="-1003775282698", threadId="6", media=R2_URL, message="...")` with:
- Account name + image number
- Model handle
- Proposed headline
- 👍 / ✏️ / ❌ options
Keep it scannable — one message per image, no walls of text.

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
