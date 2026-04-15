# NYLONGERIE_PIPELINE.md — Instagram Posting Pipeline & Protocol

_Single source of truth for all Nylongerie content operations._

---

## Accounts (8 total, 7 active + 1 paused)

| Account | IG ID | Style | Followers |
|---------|-------|-------|-----------|
| @nylondarling | 17841429713561331 | Lifestyle/editorial, flagship | 254K |
| @nyloncherie | 17841402906657029 | Classic/elegant (**PAUSED**) | 58K |
| @nylongerie | 17841402986367027 | Brand hub, product links | 46K |
| @legfashion | 17841402884847036 | Legs-focused | 46K |
| @shinynylonstar | 17841464191117228 | Shiny/glossy niche | 33K |
| @blackshinynylon | 17841471823236920 | Dark/black nylon aesthetic | 7.5K |
| @planetnylon | 17841472009081615 | Edgy: leather, vinyl, boots | 2K |
| @nextdoornylon | 17841472299535162 | Girl-next-door, casual, natural | 4.5K |

**Post to 7 active accounts daily.** @nyloncherie is paused indefinitely since 09.03.2026.

## Style → Account Mapping

- `elegant` / `lifestyle` / `editorial` → @nylondarling
- `shiny-glossy` → @shinynylonstar
- `legs-focus` → @legfashion
- `black` (dark nylon aesthetic) → @blackshinynylon
- `casual` / `girl-next-door` → @nextdoornylon
- `edgy` (leather, vinyl, latex, boots) → @planetnylon
- Product shots → @nylongerie

---

## Content Sources & Paths

- **Inbox:** `~/.openclaw/nylongerie/inbox/` (symlink → `~/Desktop/nylongerie-content/inbox/`)
- **Queue:** `~/.openclaw/nylongerie/queue.json`
- **Classifications:** `~/.openclaw/nylongerie/classify-results.json`
- **Series Map:** `~/.openclaw/nylongerie/series-map-final.json` (🔴 NEVER overwrite — 12hr Ollama run)
- **Used Images:** `~/.openclaw/nylongerie/used-images.json`
- **Banned Images:** `~/.openclaw/nylongerie/banned-images.json`
- **Story Templates:** `~/.openclaw/nylongerie/story-templates.js`

---

## ⚡ Topic 3 Context Rule

When Felix receives a message in **Topic 3 (NylonGerie)**, ALWAYS check these files before responding:

### 1. Post/Reel Queue
Check `~/.openclaw/nylongerie/queue.json` for entries with `status: "draft_sent"`. Display pending drafts with preview URLs so Lothar can approve/reject immediately.

**On approval (👍, "approve", "ja", "publish"):**
1. Set entry status to `"approved"` in queue.json
2. Run: `cd /Users/lothareckstein/.openclaw/nylongerie && node nylongerie-publish.js --id <ENTRY_ID>`
3. Report result to Topic 3

### 2. Newsletter State
Check `~/.openclaw/nylongerie/newsletter-state.json` for current status:

**If `status: "pending_approval"` and Lothar replies 1, 2, 3, or a custom topic:**
→ Run: `cd /Users/lothareckstein/.openclaw/nylongerie && node newsletter-build.js approve <choice>`
→ This auto-builds the newsletter and sends a preview back to Topic 3

**If `status: "pending_send"` and Lothar replies "senden" / "send" / "ja":**
→ Run: `cd /Users/lothareckstein/.openclaw/nylongerie && node newsletter-build.js send`
→ This sends the campaign to all subscribers via Brevo

**If Lothar replies "abbrechen" / "cancel" / "nein":**
→ Run: `cd /Users/lothareckstein/.openclaw/nylongerie && node newsletter-build.js reset`
→ Confirm cancellation in Topic 3

---

## Daily Batch (3 parts + weekly newsletter)

### A) 5 Posts/Tag (10:00 CET)

- Across 7 active accounts (rotation ensures regular content)
- Priority: @nylondarling (daily), @legfashion (4x/week), rest (2-3x/week)
- Morning batch proposal in Topic 3 for approval
- **🔴 KEIN POST OHNE CREDIT** — Model must be credited: handle tagged in caption. Images without known handle are NOT posted.

### B) 1 Story/Tag (11:00 CET)

- **Identical story** posted to 3 of 8 accounts (rotation, account must match product — e.g., no white tights on @blackshinynylon)
- **⚠️ MUST be posted manually by Lothar** — API cannot add link stickers!
- **Image MUST be a Shopify product image** (from Shopify Admin API, NOT content from inbox — Copyright!)
- Felix generates story image + uploads to R2 + sends link in Topic 3

### Story Types (Mix!)

1. **Product Stories** (~60%) — Direct product promotion with discount code/bundle
2. **Newsletter Stories** (~40%) — CTA targets newsletter signup ("15% for subscribers!", "Join our VIP list")

---

## Image Selection Rules

### Classification System
- **Script:** `~/.openclaw/workspace/nylongerie-classify-local.js`
- **Results:** `~/.openclaw/nylongerie/classify-results.json`
- **Progress:** 910/1588 images classified (as of 2026-03-29)

### Selection Criteria
- **Type:** Must be `"content"` (not `"screenshot"`)
- **Sex appeal:** 7-8 range (not too low, not too high)
- **Style variety:** Mix of editorial, legs-focus, shiny-glossy, lifestyle
- **No repeats:** 90-day cooldown via `used-images.json`
- **BANNED:** Check `banned-images.json` — NEVER use these
- **Handle required:** Must have real handle (match `/^[a-zA-Z0-9_.]+$/` after stripping @). Exclude null, none, placeholders.

### Series Linking
Images come in series: Screenshot (with visible handle) + Content images (actual photos).
Series linking propagates handles from screenshots to adjacent content images.
- `series-map-final.json` — index of 160 model series with file lists
- Linked entries have `linkedFrom` field

### Current Stats (after series linking)
- Total classified: 1,331
- Screenshots: 562 | Content: 769 | Reels: 253
- **Postable content with credit: 522** (from 205 unique models)
- By style: editorial 171, lifestyle 210, elegant 66, legs-focus 25, casual 30, shiny-glossy 6, other 14

---

## Used Images Tracking

**File:** `~/.openclaw/nylongerie/used-images.json`
**Rule:** Do NOT reuse an image for 90 days.

```json
{
  "FILENAME.jpg": {
    "used_date": "2026-03-29",
    "accounts": ["@nylondarling"],
    "type": "post"
  }
}
```

---

## Image Preparation

**NO text overlay on the image!** The image stays clean/pure. All branding, CTA, credit goes into CAPTION only. Only use Sharp for resizing/quality.

**⚠️ MANDATORY: Auto-crop white bars (screenshot artifacts) BEFORE any processing!**
Scan and remove white strips (avg brightness > 235) before cropping to aspect ratio.

**⚠️ MANDATORY: Crop to 4:5 (1080×1350) before uploading to IG!**
Instagram rejects unsupported aspect ratios (error 36003).

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

---

## Upload to R2

```javascript
cd ~/.openclaw && node -e "
require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});
async function upload(localPath, r2Key) {
  await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: r2Key, Body: fs.readFileSync(localPath), ContentType: 'image/jpeg' }));
  console.log(process.env.R2_PUBLIC_URL + '/' + r2Key);
}
upload(process.env.HOME + '/.openclaw/workspace/preview-post.jpg', 'preview/FILENAME.jpg').catch(console.error);
"
```

---

## Stories Template Engine

- **File:** `~/.openclaw/nylongerie/story-templates.js` (v3, Font-Fix update 20.03.2026)
- **Templates:** sale, product, motw, season, category
- **Font Rules (MANDATORY):**
  - Minimum font size: **30px** — nothing smaller, ever
  - All Montserrat text: **bold** weight
  - DancingScript: always with **4px stroke outline** for phone readability
  - CTA: **52px bold** with semi-transparent **background box**
  - Code pill: **44px bold**, **4px border**
  - Branding: **32px bold**, opacity 0.7, with text shadow
  - **Link sticker zone:** ~220px gap between CTA and branding

### ⚠️ Stories: NEVER publish via API!

Instagram API does NOT support link stickers. Stories ALWAYS manual via app.
1. Felix generates story image + uploads to R2
2. Sends link to Lothar in Topic 3
3. Lothar publishes manually + adds link sticker
4. **DO NOT call `media_publish` with `media_type=STORIES`!**

---

## Story Protocol — TWO CATEGORIES (Mix Daily)

### Story A: Product/Discount Promo
**When:** Sale active, new arrivals, limited offers
```
⏰ [URGENCY HOOK] ⏰
[OFFER HEADLINE]
Code: [DISCOUNT_CODE]
[DEADLINE/DETAILS] 🖤
Shop now ↗️
```
**Image:** High sex-appeal (8-9), legs-focus or shiny-glossy
**🔴 Image MUST be from Shopify** (never inbox/model photos — commercial rights!)

### Story B: Newsletter Signup
**When:** No active sale, or alternating with discount story
```
✨ EXCLUSIVE INSIDER ACCESS ✨
Join our newsletter for:
→ Early sale access
→ Exclusive discounts
→ New arrival alerts
Sign up at nylongerie.com 🖤
Link in bio ↗️
```
**Image:** Editorial style, sex-appeal 7-8

### Story Delivery
1. Felix creates story image + text
2. Sends to Lothar via Telegram Topic 3
3. Lothar downloads on iPhone + adds shopping link
4. Lothar publishes to accounts
**DO NOT:** Create stories with text overlay burned-in

---

## Caption Templates

### Copyright Attribution
**Default footer:** `📸 Unknown | DM for credit`
**If model/photographer known:** Replace with proper credit

### @nylondarling
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

### @nyloncherie (PAUSED)
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

### @legfashion
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

### @shinynylonstar
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

### Hashtags to Rotate
- #nylonfashion #tights #nylonlove
- #legfashion #heels #fashioninspo
- #shinytights #glossy #fashiondetails
- #urbanstyle #fashionphotography
- #editorial #fashionmagazine #model
- #casualstyle #everyday #elegance

---

## Pipeline Steps

### 1. Pick an Image
Check `classify-results.json` for categorized content with real handle. Prioritize images WITH credit.

### 2. Prepare Image
Auto-crop white bars → crop to 4:5 → resize to 1080x1350 via Sharp.

### 3. Upload to R2
Upload preview to Cloudflare R2 for Lothar to review.

### 4. Send Preview to Lothar
Send to **Topic 3** with: account name, model handle, proposed headline, 👍/✏️/❌ options.

### 5. Publish to Instagram
After approval: update queue.json → `node ~/.openclaw/workspace/nylongerie-publish.js {post_id}`
**⚠️ Use graph.facebook.com** (NOT graph.instagram.com) — system user tokens require Facebook Graph endpoint.

### 6. Mark as Used
Update `used-images.json` with date, accounts, type.

---

## Daily REELS (12:00 CET)

### C) 1-3 Reels/Tag (12:00 CET)

- Videos from `classify-results.json` with `type: "reel"`
- Same credit rule as posts: **handle required, no post without credit**
- Same caption templates as posts (with `#reels` hashtag added)
- Published via Instagram Graph API with `media_type: REELS`
- Reels also appear in feed (`share_to_feed: true`)
- **Always send preview to Topic 3 for Lothar approval before publishing**

### Reel Stats
- Total reels in inbox: 253 videos
- Reels with verified handles: 243
- Duration range: 3-90 seconds (enforced by selection script)

### Reel Workflow
1. **Select reels:** `node ~/.openclaw/workspace/nylongerie-create-reel-batch.js --count 3`
   - Picks reels with real handles, not yet used, 1 per model
   - Uploads video to R2 under `reels/` prefix
   - Creates queue entries with `type: "reel"` + `video_url`
   - Updates `used-images.json`
2. **Send preview to Topic 3** with R2 video URL + caption for Lothar approval
3. **After approval:** Approve in queue.json → run `node ~/.openclaw/nylongerie/nylongerie-publish.js`
   - Publish script detects `type: "reel"` automatically
   - Uses `video_url` + `media_type: REELS` via Graph API
   - Polls container status until video processing is FINISHED (up to 2 min)

### Reel Scripts
- **Handle propagation:** `~/.openclaw/workspace/nylongerie-reel-handles.js` (run once after new reels added)
- **Create batch:** `~/.openclaw/workspace/nylongerie-create-reel-batch.js --count N [--dry-run]`
- **Publish:** `~/.openclaw/nylongerie/nylongerie-publish.js` (same script as posts, auto-detects reels)

### Account Routing (same as posts)
- Reels without style classification default to @nylondarling (flagship)
- Style-based routing applies if style is set

---

## Scripts

- **Classify:** `~/.openclaw/workspace/nylongerie-classify-local.js`
- **Publish:** `~/.openclaw/nylongerie/nylongerie-publish.js`
- **Select Batch:** `~/.openclaw/workspace/nylongerie-select-batch-v2.js`
- **Create Batch:** `~/.openclaw/workspace/nylongerie-create-batch.js`
- **Crop Batch:** `~/.openclaw/workspace/nylongerie-crop-batch.js`
- **Reel Handles:** `~/.openclaw/workspace/nylongerie-reel-handles.js`
- **Reel Batch:** `~/.openclaw/workspace/nylongerie-create-reel-batch.js`
- **Daily Script:** `~/.openclaw/scripts/nylongerie-daily.sh`

## Rules Summary

- **One photo, one account** — no cross-posting
- **Always get Lothar's approval** before posting
- **No post without credit** — handle must be tagged
- **Rate limits:** 200 API calls/hr/account, 25 posts/day/account
- **R2 Public URL:** Stored in R2_PUBLIC_URL env var
- **Stories: Shopify images ONLY** — never inbox/model photos (commercial rights)

---

**Last updated:** 2026-04-10 by Claude Code consolidation
