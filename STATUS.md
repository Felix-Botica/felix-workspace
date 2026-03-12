# STATUS.md — Felix System Status
*Last updated: 2026-03-04*

## Hardware
- MacBook Air M1 running permanently as server via Amphetamine
- OpenClaw CLI v2026.3.1 (Homebrew)
- Model: Claude Opus 4.6 (Anthropic Max subscription, OAuth)

## Skills — Working ✅

### Communication
- **Gmail** — Read, search, compose, send via `gog` CLI (LotharEckstein@gmail.com)
- **Gmail "Send as"** — Replies go out as correct sender (Zoho ✅, iCloud ✅)
- **Email forwarding** — Botica (l.eckstein@botica.tech) + iCloud (l.e@me.com) → Gmail
- **Google Calendar** — Read events, detect conflicts, create appointments
- **WhatsApp** — Read/write, selfChatMode (only to/from Lothar's +491759959766)
- **Telegram** — Connected via @The1931FelixBot
- **X/Twitter** — Read timeline, check mentions, post/reply/thread (@lothareckstein)

### Instagram (Nylongerie)
- **Read** — All 5 core accounts + 3 others via Meta Graph API
- **Publish** — Feed posts (single image + carousel) and Reels
- **Cannot do** — Stories (API limitation), delete posts, add music
- **Accounts:** @nylondarling (254K), @nyloncherie (58K), @nylongerie (46K), @legfashion (46K), @shinynylonstar (34K)

### Health & Data
- **Withings** — Sleep data, heart rate, SpO2, body temp (auto-refreshing tokens)
- **Weight** — Manual tracking via WhatsApp (logged to memory/health-weight.md)
- **Image vision** — Can analyse/classify photos via Sharp + Anthropic API

### Infrastructure
- **Shell access** — Full (tools.exec.security: "full")
- **Cloudflare R2** — Image hosting for Instagram publishing (bucket: nylongerie-media)
- **Anthropic API** — For batch image classification (Sonnet)
- **Cron jobs** — Morning briefing at 07:30 CET daily
- **Web search/fetch** — Available (Brave API key needed for search)

## Nylongerie Workflow — Operational ✅

### Pipeline (end-to-end working)
1. **Intake** — Photos dropped in ~/Desktop/nylongerie-content/inbox/ (~1600 files)
2. **Classify** — Vision API detects screenshots vs content, extracts @handles
3. **Pair** — Screenshots matched to following content photos by IMG number sequence
4. **Assign** — Style classification → account assignment (editorial→@nylondarling, elegant→@nyloncherie, legs→@legfashion, shiny→@shinynylonstar, product→@nylongerie)
5. **Overlay** — Sharp adds gradient CTA banner, model credit, headline
6. **Caption** — Drafted with model mention, hashtags, CTA, copyright
7. **Upload** — Image pushed to Cloudflare R2 for public URL
8. **Publish** — Instagram Graph API: create container → wait → publish
9. **Track** — Performance monitoring (planned, not built yet)

### Progress
- 100 images classified (34 screenshots, 66 content, 0 errors)
- ~1200 images remaining
- First live post: @agnireni on @nyloncherie (2026-03-04, deleted after test)
- WhatsApp approval flow: planned, not built yet

## Morning Briefing (07:30 CET daily)
- 📬 Unread emails (urgent vs noise)
- 📅 Today's calendar + conflicts
- ⚖️ Weight trend
- 🐦 X summary: mentions, OpenClaw ecosystem, headlines
- 🛏️ Sleep data (when available)

## Not Yet Done
- [ ] Instagram performance tracking & analytics
- [ ] Instagram Stories workflow (prepare for manual posting)
- [ ] WhatsApp approval flow for Nylongerie batches
- [ ] Batch process remaining ~1200 images
- [ ] Shopify integration (product data, email triggers)
- [ ] Contact tier system
- [ ] Email auto-triage / smart replies
- [ ] Google Drive integration (supported by gog, not tested)
- [ ] Brave Search API key (web_search currently broken)
- [ ] Withings weight data sync investigation (Renpho → Apple Health → Withings API doesn't work)

## Credentials Location
All API keys/tokens stored in `~/.openclaw/.env`:
- X/Twitter (consumer + access tokens + bearer)
- Withings (client ID/secret, access/refresh tokens — auto-refresh on 401)
- Anthropic API key
- Cloudflare R2 (account ID, access key, secret, endpoint, bucket, public URL)
- Meta/Instagram (permanent system user token)
