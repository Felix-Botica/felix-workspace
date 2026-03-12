# INSTAGRAM_SKILL.md — Instagram Graph API Integration

## Setup
- **API:** Instagram Graph API via Meta Business Suite (Good Harbour Group)
- **App:** Felix Nylongerie (App-ID: 2219285271929500)
- **System User:** Felix (ID: 61588378958652, Admin)
- **Token:** META_ACCESS_TOKEN in `~/.openclaw/.env` (permanent system user token)
- **API Version:** v25.0
- **Base URL:** https://graph.facebook.com/v25.0/

## Account Portfolio

| Account | Username | IG ID | Followers | Posts | Niche |
|---------|----------|-------|-----------|-------|-------|
| Nylon Darling | @nylondarling | 17841429713561331 | 254,240 | 1,316 | Flagship, lifestyle |
| Nylon Cherie | @nyloncherie | 17841402906657029 | 57,806 | 260 | Elegant/classic |
| Nylongerie | @nylongerie | 17841402986367027 | 46,420 | 569 | Brand hub, product links |
| Leg Fashion | @legfashion | 17841402884847036 | 45,618 | 421 | Legs & fashion focus |
| Shiny Nylon Star | @shinynylonstar | 17841464191117228 | 33,546 | 230 | Shiny/glossy niche |
| WALL MOON Studios | @wallmoonstudios | 17841445728077347 | 13 | 20 | Art/creative |
| vimondo art | @vimondoart | 17841445492587197 | 3 | 1 | Art |
| vimondo Group | @vimondogroup | 17841445836043232 | 6 | 1 | Group |

**Total followers:** ~437,000+
**Core Nylongerie accounts (5):** @nylondarling, @nyloncherie, @nylongerie, @legfashion, @shinynylonstar

## Critical Rule: One Photo, One Primary Account
Each photo goes to ONE account only. Do not cross-post the same image across multiple accounts.
**Exception:** Only truly standout content (1-2x per week max) may appear on its primary account plus @nylongerie with a product link.

## Content Assignment Logic
- Classic/elegant → @nyloncherie
- Lifestyle/editorial → @nylondarling
- Glossy/shiny → @shinynylonstar
- Legs-focused → @legfashion
- Product shots with shop links → @nylongerie
- Art/creative → @wallmoonstudios

## Posting Flow (3-Step Process)

### Step 1: Create Media Container
```bash
curl -X POST "https://graph.facebook.com/v25.0/{ig_account_id}/media" \
  -d "image_url={public_image_url}" \
  -d "caption={caption_text}" \
  -d "access_token={META_ACCESS_TOKEN}"
# Returns: { "id": "container_id" }
```

### Step 2: Check Container Status (wait for processing)
```bash
curl "https://graph.facebook.com/v25.0/{container_id}?fields=status_code&access_token={META_ACCESS_TOKEN}"
# Wait until status_code = "FINISHED"
```

### Step 3: Publish
```bash
curl -X POST "https://graph.facebook.com/v25.0/{ig_account_id}/media_publish" \
  -d "creation_id={container_id}" \
  -d "access_token={META_ACCESS_TOKEN}"
# Returns: { "id": "media_id" }
```

### Carousel Post (Multiple Images)
```bash
# Create child containers first (no caption on children)
curl -X POST "https://graph.facebook.com/v25.0/{ig_id}/media" \
  -d "image_url={url1}" -d "is_carousel_item=true" -d "access_token={TOKEN}"
# Repeat for each image...

# Create carousel container
curl -X POST "https://graph.facebook.com/v25.0/{ig_id}/media" \
  -d "caption={caption}" \
  -d "media_type=CAROUSEL" \
  -d "children={child_id1},{child_id2},{child_id3}" \
  -d "access_token={TOKEN}"

# Publish carousel
curl -X POST "https://graph.facebook.com/v25.0/{ig_id}/media_publish" \
  -d "creation_id={carousel_container_id}" \
  -d "access_token={TOKEN}"
```

### Reel Post
```bash
curl -X POST "https://graph.facebook.com/v25.0/{ig_id}/media" \
  -d "video_url={public_video_url}" \
  -d "caption={caption}" \
  -d "media_type=REELS" \
  -d "access_token={TOKEN}"
```

## Reading Data

### Get Recent Posts
```bash
curl "https://graph.facebook.com/v25.0/{ig_id}/media?fields=id,caption,timestamp,media_type,like_count,comments_count&limit=10&access_token={TOKEN}"
```

### Get Post Insights
```bash
curl "https://graph.facebook.com/v25.0/{media_id}/insights?metric=impressions,reach,engagement,saved&access_token={TOKEN}"
```

### Get Account Insights
```bash
curl "https://graph.facebook.com/v25.0/{ig_id}/insights?metric=impressions,reach,follower_count&period=day&since={unix_start}&until={unix_end}&access_token={TOKEN}"
```

### Get Comments
```bash
curl "https://graph.facebook.com/v25.0/{media_id}/comments?fields=id,text,username,timestamp&access_token={TOKEN}"
```

### Reply to Comment
```bash
curl -X POST "https://graph.facebook.com/v25.0/{comment_id}/replies" \
  -d "message={reply_text}" \
  -d "access_token={TOKEN}"
```

## Rate Limits
- **200 API calls per user per hour** per account
- **25 posts per day** per Instagram account (publishing limit)
- Container creation counts toward the 200/hour limit
- Always check `x-app-usage` and `x-business-use-case-usage` headers

## Image Requirements
- **image_url must be publicly accessible** (not localhost or private URLs)
- Supported formats: JPEG, PNG
- Max file size: 8MB for images
- Aspect ratios: 4:5 to 1.91:1 (square 1:1 is ideal)
- For Reels: MP4, max 15 minutes, max 1GB

## Approval Workflow
1. Felix selects photo from content queue and assigns to account
2. Felix drafts caption (use account's tone/style)
3. Felix sends draft to Lothar via WhatsApp for approval
4. Lothar approves (or edits)
5. Felix publishes to the assigned account
6. Felix logs result (post ID, engagement after 24h)

**Never post without Lothar's explicit approval.**

## Caption Template
```
{main_caption}

{hashtags}

📸 @{photographer_credit} (if applicable)
🛒 Shop link in bio (for @nylongerie product posts only)
```

## Hashtag Strategy
- 20-25 hashtags per post (mix of sizes)
- Account-specific hashtag sets (maintain in content queue)
- Always include: #nylongerie (brand tag)
- Rotate hashtags to avoid shadowban

## Scripts
- `~/.openclaw/instagram-test.js` — Test script to verify API access and list all accounts
