# TOOLS.md — Available Integrations & Capabilities

## Active Integrations

### Gmail (via gog CLI)
- **Account:** LotharEckstein@gmail.com
- **Commands:** `gog gmail search`, `gog gmail send`, `gog gmail read`
- **Google Cloud:** verdant-nova-488516-n7 (Production, OAuth tokens don't expire if used regularly)
- **Aliases:** l.eckstein@botica.tech, lowtar@mac.com (Send As configured)
- **Forwarding:** Zoho + iCloud → Gmail active

### Google Calendar (via gog CLI)
- `gog calendar list` / `gog calendar events <id> --from <iso> --to <iso>`

### WhatsApp
- **Phone:** +491759959766 | selfChatMode | DM allowlist
- **Session expires:** ~14 days → `openclaw channels login whatsapp`

### Telegram
- **Bot:** @The1931FelixBot | User: 287505381

### X / Twitter
- **Account:** @lothareckstein (ID: 13020562) | Pay Per Use tier
- **Creds:** `~/.openclaw/.env` | **Rule:** Always draft + approval before posting

### Withings Health
- **User:** 23049153 | ScanWatch + Body+ + Renpho
- **API:** wbsapi.withings.net | Auto-refresh on 401
- **Skill:** HEALTH_SKILL.md

### Instagram Graph API
- **App:** Felix Good Harbour (1674744250563678) | System User Felix (Admin)
- **Token:** META_ACCESS_TOKEN (permanent)
- **Accounts (8):** @nylondarling (254K), @nyloncherie (58K, paused), @nylongerie (46K), @legfashion (46K), @shinynylonstar (33K), @blackshinynylon (7.5K), @nextdoornylon (4.5K), @planetnylon (2K)
- **Limits:** 200 calls/hr/account, 25 posts/day | **Rule:** Always approval before posting
- **Skill:** INSTAGRAM_SKILL.md

### Shopify
- **Store:** ecb34e-4.myshopify.com | Token: SHOPIFY_ACCESS_TOKEN
- **Scopes:** read_products, write_discounts, write_price_rules, read_orders, read_inventory

### Brevo (Email CRM)
- **Plan:** Free (300/day) | Sender: Alex <hello@nylongerie.com> (verified sender, domain NOT verified)
- **List:** "Nylongerie Subscribers" (ID:3) — 663 deliverable (Stand 23.03.2026)
- **Sync:** `scripts/brevo-shopify-reconcile.py` (mandatory before campaigns)
- **Revenue:** Email = #1 channel (40 orders, €2.593)
- **🔴 CRITICAL SETUP ISSUES (Stand 29.03.2026):**
  - Domain nylongerie.com NOT verified → SPF/DKIM records missing in United Domains DNS
  - Free plan blocks API campaigns >300 contacts → API returns 204 but campaigns go suspended
  - **FIX REQUIRED:** Verify domain (Brevo Settings → Senders & IP → Domains), upgrade to Starter Plan (~$9/mo)
  - **API campaigns unreliable until fixed** — manual UI sends only workaround

### Whisper (Voice)
- whisper-cli v1.8.3 | Model: ggml-base.bin | ~3s for 30s audio

### Felix Email
- felix@botica.tech — can send/receive via Gmail/gog

## Infrastructure
- **Ollama:** LLaVA 7B (localhost:11434) — image classification
- **Cloudflare R2** — image storage
- **Sharp** — image resize (no text overlay!)
- **GitHub** — nightly backup active

## Key Commands
```bash
openclaw gateway start|stop|restart|status
openclaw cron list|run <id>
gog gmail search "is:unread"
gog calendar events <id> --from <iso> --to <iso>
gog auth status
```
