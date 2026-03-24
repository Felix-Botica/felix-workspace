# TOOLS.md — Available Integrations & Capabilities

## Active Integrations

### Gmail (via gog CLI)
- **Status:** WORKING
- **Account:** LotharEckstein@gmail.com
- **Capabilities:** Read, search, categorize, compose, send
- **Default account set:** GOG_ACCOUNT=LotharEckstein@gmail.com in ~/.zshrc
- **Commands:**
  - `gog gmail search "is:unread"` — find unread messages
  - `gog gmail search "newer_than:7d" --max 10` — recent messages
  - `gog gmail send --to user@example.com --subject "Hi" --body "Hello"` — send email

### Google Calendar (via gog CLI)
- **Status:** WORKING
- **Capabilities:** Read events, detect conflicts, create appointments
- **Commands:**
  - `gog calendar list` — list calendars
  - `gog calendar events <calendarId> --from <iso> --to <iso>` — list events

### WhatsApp
- **Status:** LINKED
- **Phone:** +491759959766
- **Mode:** selfChatMode (messages to own number go to Felix)
- **Policy:** DM allowlist (only +491759959766 can message Felix)
- **Note:** Session expires after ~14 days — re-scan QR with `openclaw channels login whatsapp`

### Telegram
- **Status:** CONNECTED
- **Bot:** @The1931FelixBot
- **User ID:** 287505381

### Shell Execution (tools.elevated)
- **Status:** ENABLED
- **Security:** full
- **Allowed from:** WhatsApp, Telegram, webchat (all using wildcard)
- **Note:** This is what lets Felix run gog commands and other shell tools

### X / Twitter (via twitter-api-v2)
- **Status:** WORKING
- **Account:** @lothareckstein (ID: 13020562)
- **App:** OpenclawX Integration (ID: 32484094)
- **Tier:** Pay Per Use (~1,080,000 requests/month)
- **Capabilities:** Post tweets, reply, threads, search, check mentions
- **Credentials:** `~/.openclaw/.env` (loaded via dotenv)
- **Skill file:** See X_SKILL.md for full command reference
- **Rules:** Always draft and get Lothar's approval before posting. Never post autonomously.

### Withings Health Data (via OAuth2 API)
- **Status:** WORKING
- **Account:** lothareckstein@gmail.com (User ID: 23049153)
- **API Endpoint:** https://wbsapi.withings.net
- **Devices:** ScanWatch (sleep, HR, SpO2, activity), Body+ (storage), Renpho scale (via Apple Health sync)
- **Capabilities:** Sleep data, heart rate, SpO2, activity/steps, weight/body composition
- **Credentials:** `~/.openclaw/.env` (WITHINGS_ACCESS_TOKEN, WITHINGS_REFRESH_TOKEN, etc.)
- **Token expiry:** 3 hours — auto-refresh on 401 using refresh token
- **Skill file:** See HEALTH_SKILL.md for full API reference and health alert rules
- **Key context:** Sleep is Lothar's biggest health concern. Be direct — he prefers blunt honesty over diplomatic softening.

### Instagram Graph API (via Meta Business Suite)
- **Status:** WORKING
- **Business Portfolio:** Good Harbour Group
- **App:** Felix Good Harbour (App-ID: 1674744250563678)
- **System User:** Felix (ID: 61588378958652, Admin)
- **Token:** META_ACCESS_TOKEN in `~/.openclaw/.env` (permanent, no expiry)
- **Accounts connected:** 8 (5 core Nylongerie + 3 others)
- **Core accounts:** @nylondarling (254K), @nyloncherie (57K), @nylongerie (46K), @legfashion (45K), @shinynylonstar (33K)
- **Capabilities:** Read posts/insights, publish photos/carousels/reels, manage comments
- **Rate limits:** 200 API calls/hour/account, 25 posts/day/account
- **Skill file:** See INSTAGRAM_SKILL.md for full API reference, posting flow, and account mapping
- **Rules:** Always get Lothar's approval before posting. Never post autonomously.

## Working But Needs Completion

### Email Forwarding
- **Zoho (l.eckstein@botica.tech) → Gmail:** ACTIVE — forwarding enabled in Zoho Mail settings
- **iCloud (lowtar@mac.com) → Gmail:** ACTIVE — forwarding enabled in iCloud Mail settings
- **Moba (United Domains):** Skipped — not worth the effort
- **Gmail "Send mail as" aliases:** ✅ DONE (2026-03-09) — l.eckstein@botica.tech and iCloud alias configured. Felix can now reply as the original address.
- **Result:** Felix now sees all Botica and iCloud mail in Gmail inbox

### Daily Briefing Cron
- **Status:** ACTIVE
- **Schedule:** 07:30 CET daily (cron ID: 2187e388-ef9c-4c8e-8f5b-57b64f8a87aa)
- **Channel:** WhatsApp to +491759959766
- **Content:** Email + calendar summary + health data (integrate Withings)
- **Commands:** `openclaw cron list` / `openclaw cron run 2187e388-ef9c-4c8e-8f5b-57b64f8a87aa`

### Brevo (Email CRM)
- **Status:** READY TO SEND
- **Account:** Botica.tech (L.e@me.com)
- **Plan:** Free — 300 emails/day (3 Batches für volle Liste)
- **Contacts:** 663 subscribed + zustellbar (Shopify ↔ Brevo synced, Delta 0) — Stand 23.03.2026
- **Reconcile-Script:** `scripts/brevo-shopify-reconcile.py` — VOR jedem Import/Kampagne laufen lassen
- **Lists:** "Nylongerie Subscribers" (ID: 3) — 730 Kontakte zugewiesen
- **Sender:** Alex <hello@nylongerie.com> (verified + authenticated ✅)
- **Domain:** nylongerie.com — SPF/DKIM/DMARC verified via Strato (managed by Uwe)
- **API Key:** BREVO_API_KEY_REST in `~/.openclaw/.env` (xkeysib-...)
- **SMTP Key:** BREVO_SMTP_KEY in `~/.openclaw/.env` (xsmtpsib-...)
- **Revenue Impact:** Email = #1 Revenue Channel — 40 Orders, €2.593 via Shopify Email
- **Best Patterns:** Collection-focused, 25% discount, bold language, product-specific
- **Rabattcode:** SPRING30 (30% off, bis 3. April, 1x/Kunde)
- **Template v2:** Spring Sale ready — wartet auf Approval
- **API Docs:** https://developers.brevo.com/reference
- **Access:** Only Lothar (not Uwe)

## Not Yet Connected

### Contact Tier System
- Designed (5 tiers from Family to Business)
- Not yet built as custom OpenClaw skill

## Google Cloud Project
- **Project:** OpenClaw Gmail (verdant-nova-488516-n7)
- **APIs enabled:** Gmail, Google Calendar
- **Scopes:** Drive, Gmail (read/compose/send/settings), Calendar, Docs, Sheets, Contacts (read-only), Chat
- **Billing:** PAID — billing account set up, trial credit still available

### Whisper (Voice Transcription)
- **Status:** WORKING
- **Binary:** whisper-cli (whisper-cpp v1.8.3 via Homebrew)
- **Model:** ~/.openclaw/models/ggml-base.bin (base, 147MB)
- **Performance:** ~3 sec for 30 sec audio on M1
- **Usage:**
  ```bash
  ffmpeg -i input.ogg -ar 16000 -ac 1 /tmp/voice.wav -y
  whisper-cli -m ~/.openclaw/models/ggml-base.bin -l de -f /tmp/voice.wav
  ```
- **Supported:** OGG (WhatsApp voice messages), MP3, M4A — convert to WAV first via ffmpeg
- **Languages:** Auto-detect or specify with `-l de` / `-l en`

## Key Commands Reference
```bash
# Gateway
openclaw gateway start|stop|restart|status
openclaw health
openclaw doctor --fix

# Channels
openclaw channels list
openclaw channels login --channel <name>
openclaw channels add --channel <name> --token "<token>"

# Plugins
openclaw plugins list
openclaw plugins enable <name>

# Config
openclaw config get <key>
openclaw config set <key> <value>

# Logs
openclaw logs --follow
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log

# Google
gog gmail search "is:unread"
gog calendar list
gog auth status
```
