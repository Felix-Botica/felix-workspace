# Nylongerie Posting Protocol

**MANDATORY:** Read this file before ANY Instagram post or story creation.

---

## Active Accounts (8 total, 7 active + 1 paused)

1. @nylondarling (254K) — Active
2. @nylongerie (46K) — Active
3. @legfashion (46K) — Active
4. @shinynylonstar (33K) — Active
5. @blackshinynylon (7.5K) — Active
6. @nextdoornylon (4.5K) — Active
7. @planetnylon (2K) — Active
8. @nyloncherie (58K) — PAUSED (do not post)

**Post to 7-8 accounts daily** (one account can get 2 posts if good content available).

---

## Image Selection Rules

### Classification System
- **Location:** `~/.openclaw/nylongerie/classify-results.json`
- **Total pool:** ~1588 images in `~/Desktop/nylongerie-content/inbox/`
- **Classified so far:** Check with `jq 'length' ~/.openclaw/nylongerie/classify-results.json`

### Selection Criteria
- **Type:** Must be `"content"` (not `"screenshot"`)
- **Sex appeal:** 7-8 range (not too low, not too high)
- **Style variety:** Mix of editorial, legs-focus, shiny-glossy, lifestyle
- **No repeats:** Track used images in `used-images.json` (see below)
- **BANNED IMAGES:** Check `~/.openclaw/nylongerie/banned-images.json` — NEVER use these files

### Copyright Attribution
**Default caption footer:** `📸 Unknown | DM for credit`

**If model/photographer known:** Replace with proper credit

---

## Story Protocol — TWO CATEGORIES (Mix Daily)

### Story A: Product/Discount Promo
**When:** Sale active, new arrivals, limited offers
**Format:**
```
⏰ [URGENCY HOOK] ⏰

[OFFER HEADLINE]
Code: [DISCOUNT_CODE]

[DEADLINE/DETAILS] 🖤

Shop now ↗️
```

**Image:** High sex-appeal (8-9), legs-focus or shiny-glossy
**Add in Instagram:** Shopping link to collection page

### Story B: Newsletter Signup (Converts Best!)
**When:** No active sale, or alternating with discount story
**Format:**
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
**Add in Instagram:** Link to homepage (signup popup triggers)

### Story Delivery Process
1. Felix creates story image + text (separate files)
2. Sends to Lothar via Telegram
3. Lothar downloads on iPhone
4. Lothar adds shopping link in Instagram
5. Lothar publishes to all 8 accounts

**DO NOT:** Create stories with text overlay burned-in (Lothar adds text/links manually)

---

## Used Images Tracking

**File:** `~/.openclaw/nylongerie/used-images.json`

**Format:**
```json
{
  "4DBF6FA8-2FC0-498C-9EB3-3ECB6BFB9601.jpg": {
    "used_date": "2026-03-29",
    "accounts": ["@nylondarling"],
    "type": "post"
  }
}
```

**Rule:** Do NOT reuse an image for 90 days (3 months)

**Before selecting images:**
```bash
# Check if image was used recently
jq '.["FILENAME.jpg"].used_date' ~/.openclaw/nylongerie/used-images.json
```

**After posting:**
```bash
# Mark image as used
jq --arg file "FILENAME.jpg" --arg date "$(date +%Y-%m-%d)" \
  '.[$file] = {used_date: $date, accounts: ["@account"], type: "post"}' \
  ~/.openclaw/nylongerie/used-images.json > tmp && mv tmp ~/.openclaw/nylongerie/used-images.json
```

---

## Post Preview Protocol

**BEFORE publishing, always:**
1. Create `post-drafts-YYYY-MM-DD.json` with:
   - Account name
   - Image filename
   - Full caption with hashtags
   - Style + sex_appeal rating
2. Send file to Lothar for review
3. Wait for approval
4. Then publish

**DO NOT:** Publish without showing Lothar the images + captions first

---

## Caption Structure

```
[HOOK/DESCRIPTION] [EMOJI]

[CALL TO ACTION with discount code]

📸 [Credit]

[4-6 HASHTAGS]
```

**Hashtags to rotate:**
- #nylonfashion #tights #nylonlove
- #legfashion #heels #fashioninspo
- #shinytights #glossy #fashiondetails
- #urbanstyle #fashionphotography
- #editorial #fashionmagazine #model
- #casualstyle #everyday #elegance

---

## Reclass
ification Status

**Last run:** 2026-03-29 11:47
**Progress:** 910/1588 images classified
**Script:** `~/.openclaw/workspace/nylongerie-classify-local.js`
**Results:** `~/.openclaw/nylongerie/classify-results.json`

**To check progress:**
```bash
jq 'length' ~/.openclaw/nylongerie/classify-results.json
```

**To restart/resume:**
```bash
cd ~/.openclaw/workspace
node nylongerie-classify-local.js 100 [START_FROM]
```

---

## Daily Workflow

1. **Check classification progress** (should be complete)
2. **Select 7-8 images** (variety of styles, sex_appeal 7-8, not used recently)
3. **Create post drafts JSON** with captions + account assignments
4. **Send to Lothar for review**
5. **Create 1-2 stories** (mix discount + newsletter types)
6. **Send story images + text to Lothar**
7. **After Lothar approves:** Publish posts
8. **Mark all images as used** in used-images.json

---

## Emergency Contacts

If classification breaks or images missing:
- Images location: `~/Desktop/nylongerie-content/inbox/`
- Classification script: `~/.openclaw/workspace/nylongerie-classify-local.js`
- Ollama service: `brew services restart ollama`

---

**Last updated:** 2026-03-29 by Felix
