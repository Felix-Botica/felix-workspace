# OPERATIONS.md — Felix Operational Knowledge

_Single source of truth for models, infrastructure, tools, crons, tokens, and rules._
_Updated: 2026-05-09 12:45 CET_

---

## Lothar — Who He Is

- First Managing Director Amazon Germany (Team 800) — world-class career
- Pattern: Erfolg → Beziehungsbruch → Neuanfang → Repeat
- Crypto/Blockchain-Phase: Kunstgalerie Tokyo, Art Magazine, Tezos/LUKSO
- Selbstbewusst über Schwächen: "I know most of it but I don't execute"
- Accountability-Gap, nicht Knowledge-Gap. Spreading thin.

## Active Businesses

- **Botica.tech** — AI Agents (Seger/Voxa, Festo, ScienceNow)
- **Nylongerie** — E-Commerce + Instagram (490K+ Follower, 7 active + 1 paused account)
  - **Alle 8 Accounts:** @nylondarling (254K), @nylongerie (46K), @legfashion (46K), @shinynylonstar (33K), @blackshinynylon (7.5K), @nextdoornylon (4.5K), @planetnylon (2K) — @nyloncherie (58K) PAUSED
  - **Posting-Ziel:** Feed-Post-Drafts via RECYCLE only, 1 Story/Tag mit Promocode, 1 Reel/Tag
- **Manheimer Berlin** — E-Commerce

## Key Relationships

→ Full details in `memory/people.md`
- **Freundin:** Chanté-Whitney Heinz (+4917661407816)
- **Engster Kreis:** Andreas Büchelhofer, Uwe Schröder, Helmut Morent
- **Key Business:** Peter Badge (ScienceNow 35%), Fabian Vogelsteller (LUKSO), Stephan Clausen (PR/Manheimer)

## Travel

- **29.03–01.04.2026:** Monaco
- **Aktuell:** Conil de la Frontera (Standort in `~/.openclaw/config/location.txt`)

---

## Model Policy (PERMANENT)

| Role | Model | Purpose |
|------|-------|---------|
| **Default** | google/gemini-2.5-flash | Routine execution and concise synthesis |
| **Fast** | google/gemini-2.5-flash-lite | Cheap/simple extraction and short classification |
| **Premium reasoning** | google/gemini-2.5-pro | Newsletter topics/content, X/Reddit/content intelligence, system review synthesis |
| **Vision** | google/gemini-2.5-flash | Image classification, handle extraction |

- **Anthropic:** do not use as default or fallback.
- **MiniMax:** legacy provider; do not route new cron/agent work there unless explicitly requested.
- **Premium model guardrail:** use `gemini-2.5-pro` only where real reasoning is needed, not for deterministic plumbing.

## Agent Architecture

| Agent | Model | Purpose |
|-------|-------|---------|
| main (Felix) | google/gemini-2.5-flash default; gemini-2.5-pro for reasoning slices | Lothar's personal agent |
| observer | google/gemini-2.5-flash-lite | Silent logger for non-Lothar WhatsApp/Telegram |
| nylongerie | google/gemini-2.5-flash default; gemini-2.5-pro for newsletter/content reasoning | Instagram content management (isolated workflow) |

---

## Active Integrations

### Gmail / Email (via gog CLI)
- **Account:** LotharEckstein@gmail.com (unified inbox)
- **Commands:** `gog gmail search`, `gog gmail send`, `gog gmail read`, `gog gmail modify`
- **Google Cloud:** verdant-nova-488516-n7 (Production, OAuth tokens don't expire if used regularly)
- **Aliases:** l.eckstein@botica.tech, lowtar@mac.com (Send As configured)
- **Forwarding:** Zoho + iCloud → Gmail active
- **⚠️ EMAIL RULES:** All triage, routing, and response rules → `EMAIL_RULES.md`

### Google Calendar (via gog CLI)
- `gog calendar list` / `gog calendar events <id> --from <iso> --to <iso>`

### WhatsApp
- **Phone:** +491759959766 | selfChatMode | DM allowlist
- **Session expires:** ~14 days → `openclaw channels login whatsapp`

### Telegram
- **Bot:** @The1931FelixBot | User: 287505381
- **Felix HQ:** -1003775282698 (Topics: 1=General, 3=NylonGerie, 4=Digest, 66=Inbox&Drafts, 125=Dev&Pipeline)

### X / Twitter
- **Account:** @lothareckstein (ID: 13020562) | Pay Per Use tier
- **Status:** ✅ X_BEARER_TOKEN valid (read-only). OAuth2 Client Credentials (X_CLIENT_ID/X_CLIENT_SECRET) broken — not needed for current read-only usage.
- **Rule:** Always draft + approval before posting
- **WICHTIG:** Healthcheck uses `X_BEARER_TOKEN` (nicht `TWITTER_BEARER_TOKEN`)

### Withings Health
- **User:** 23049153 | ScanWatch + Body+ + Renpho
- **API:** wbsapi.withings.net | Auto-refresh on 401

### Instagram Graph API
- **App:** Felix Good Harbour (1674744250563678) | System User Felix (Admin)
- **Token:** META_ACCESS_TOKEN (permanent)
- **Accounts (8):** See Nylongerie section above
- **Limits:** 200 calls/hr/account, 25 posts/day
- **Rule:** Always approval before posting

### Shopify
- **Store:** ecb34e-4.myshopify.com | Token: SHOPIFY_ACCESS_TOKEN
- **Scopes:** read_products, write_discounts, write_price_rules, read_orders, read_inventory

### Brevo (Email CRM)
- **Plan:** Free (300/day) | Sender: Alex <hello@nylongerie.com> (verified sender + domain)
- **List:** "Nylongerie Subscribers" (ID:9) — 739 deliverable
- **Sync:** `scripts/brevo-shopify-reconcile.py` (mandatory before campaigns)
- **Revenue:** Email = #1 channel (40 orders, €2.593)
- **🔴 RULES:**
  - NEVER manually import contacts to Brevo. ONLY via `scripts/brevo-sync.py`.
  - Before any campaign: Run `scripts/brevo-shopify-reconcile.py` — if not clean, do not send.
  - Never report Brevo numbers from memory. Always query live via script or API.
  - After any sync: Verify deliverable count matches Shopify subscribed (delta ≤ 5).
  - Brevo API 204 ≠ Success — ALWAYS set 15-min timer + check status.

### Whisper (Voice)
- whisper-cli v1.8.3 | Model: ggml-base.bin | ~3s for 30s audio

### Felix Email
- felix@botica.tech — can send/receive via Gmail/gog

## Infrastructure

- **Ollama:** LLaVA 7B (localhost:11434) — image classification
- **Cloudflare R2** — image storage
- **Sharp** — image resize (no text overlay!)
- **GitHub** — nightly backup active
- **Tailscale:** Active since 26.03.2026
  - Felix MacBook Air: 100.83.135.93 (Dashboard: :18789)
  - Lothar MacBook Air 2: 100.122.205.86

## Key Commands

```bash
openclaw gateway start|stop|restart|status
openclaw cron list|run <id>
gog gmail search "is:unread"
gog calendar events <id> --from <iso> --to <iso>
gog auth status
```

---

## Cron Jobs (LaunchAgent Source of Truth)

Deterministic jobs run via `~/Library/LaunchAgents/ai.openclaw.cron.*.plist` and `~/.openclaw/scripts/cron-runner.sh`. OpenClaw `cron/jobs.json` entries are intentionally disabled to avoid duplicate agent-session drift.

Active Nylongerie LaunchAgents:
- `nylongerie-recycle` daily 09:00 — only active feed-post draft source
- `nylongerie-story` daily 11:00
- `nylongerie-reel` daily 12:00

No `nylongerie-post` LaunchAgent is loaded. The pre-approved-pool/direct POST pipeline is disabled and must not be re-enabled without Lothar's explicit written approval.

**External Monitors (crontab):** gateway-health (5min), briefing-monitor (07:45), digest-monitor (20:45 + retries)
**Disabled:** WA Inbox Digest (heartbeat-run mid-April while token refresh was broken — now fixed), Nylongerie Daily POST / pre-approved pool, Weekly Classification, all OpenClaw `cron/jobs.json` agent crons.

### Cron Mandatory Config

Every cron job MUST have:
```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "...",
    "lightContext": true,
    "timeoutSeconds": 120,
    "model": "google/gemini-2.5-flash"
  },
  "delivery": {
    "mode": "announce",
    "channel": "telegram",
    "to": "telegram:-1003775282698:<topic_id>"
  },
  "sessionTarget": "isolated",
  "wakeMode": "now"
}
```

**Why `lightContext: true`:** Without it, isolated cron sessions cannot access outbound channel configuration → "Outbound not configured for channel: telegram" error. Root cause of March 27-29 cron failures.

### Cron Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Outbound not configured for channel: telegram" | Add `lightContext: true` to payload |
| Deterministic cron runs but doesn't deliver | Check `~/.openclaw/logs/cron-runner/<job>.latest.log` and Telegram send output |
| Deterministic cron times out | Run through `~/.openclaw/scripts/cron-runner.sh <job>` with a larger `FELIX_CRON_TIMEOUT_SECONDS` only for that trial |
| Wrong model or old instructions | Update `~/.openclaw/config/deterministic-schedule.json`, `~/.openclaw/scripts/cron-runner.sh`, or the relevant pipeline README; OpenClaw `cron/jobs.json` is disabled |

### Testing Protocol

**Safe to test anytime:** Digests, health checks, reports, reminders
**Require approval:** Content generation, email campaigns, external writes

```bash
cd ~/.openclaw
FELIX_CRON_TIMEOUT_SECONDS=300 scripts/cron-runner.sh <job-name>
tail -80 ~/.openclaw/logs/cron-runner/<job-name>.latest.log
```

---

## Token Health

| Service | Status | Expiry | Auto-Refresh |
|---------|--------|--------|--------------|
| **Withings** | ✅ Valid | ∞ (2 years) | ✅ Daily 08:00 |
| **Instagram** | ✅ Valid | 60 days | ✅ API-based |
| **Google OAuth** | ✅ Valid | ∞ (auto) | ✅ gog CLI |
| **WhatsApp** | ✅ Active | 14 days | ❌ Manual |
| **Shopify** | ✅ Permanent | ∞ | N/A |
| **Brevo** | ✅ Permanent | ∞ | N/A |
| **X/Twitter** | ❌ Broken | ∞ | 401 auth — deferred |
| **MiniMax** | Legacy / not routed | Balance-based | N/A |

### Token Automation

**Cron:** `token-refresh` (be5f6274) — runs every 2 hours
```
08:00 → token-refresh-extended.sh runs
├─ Withings: Refresh token via OAuth
├─ Instagram: Check & refresh if < 7 days to expiry
├─ Google: Verify OAuth (gog handles it)
└─ WhatsApp: Check session status, alert if < 2 days
```

### Alert Rules

- **< 2 days (immediate):** WhatsApp → "Run: `openclaw channels login whatsapp`" → Topic 125
- **< 7 days (warning):** Instagram → auto-refresh will attempt → Topic 125
- **< 14 days (info):** Withings or other → monitor

### Manual Token Operations

**WhatsApp:** `openclaw channels login whatsapp` → scan QR → 14-day session
**Instagram (fallback):** Update META_ACCESS_TOKEN in .env → `openclaw gateway restart`
**Google (fallback):** `gog auth refresh` or full re-auth: `rm ~/Library/Application\ Support/gogcli/credentials.json && gog auth init`
**Withings (fallback):** `~/.openclaw/workspace/scripts/token-refresh-extended.sh --force-all`

### Token Files

| File | Purpose |
|------|---------|
| `~/.openclaw/.env` | Token storage (daily via cron) |
| `memory/tokens.json` | Token metadata & status |
| `scripts/token-refresh-extended.sh` | Auto-refresh executor |
| `scripts/health-check-safe.sh` | Health verification |

---

## Heartbeat & Periodic Tasks

### Heartbeat Behavior

When receiving a heartbeat poll, use it productively — don't just reply `HEARTBEAT_OK`.

**Check on every heartbeat:**
1. `memory/operations.json` — execute due next_actions, update stats
2. `memory/tokens.json` — check upcoming expiries

**Rotate through (2-4x/day):**
- Emails: urgent unread?
- Calendar: events in next 24-48h?
- WhatsApp session health
- Integration health (Withings, Gmail/gog, Shopify)

**Reach out when:** Important email, calendar event < 2h, token expiring, something broken
**Stay quiet when:** Late night (23:00-08:00), nothing new, checked < 30min ago

**Proactive background work:** Organize memory, check projects, update docs, commit changes, review OPERATIONS.md

### Google Cloud Trial

- Trial had ~€258 credit as of Feb 25, 2026
- Warn Lothar when credit drops below €50 or 5 days remain
- Losing this = Gmail + Calendar APIs stop working

---

## Operations State Tracking

- `memory/operations.json` = Single Source of Truth for multi-day tasks
- Every heartbeat reads operations.json and executes due next_actions
- Never trust session memory — always update state file
- API-Status immer live prüfen — nie aus Memory-Files ableiten
- Immer Nummer → Name auflösen via `memory/people.md`

---

## Nylongerie Growth Machine — PERMANENT GOALS (since 2026-04-08)

### 📧 Newsletter/Week (Thursday 10:00 CET) — FINAL SPECIFICATION

**Script:** `~/.openclaw/nylongerie/newsletter-build.js`
**Cron:** Thursday 10:00 CET → Felix runs `propose`

**Workflow (state machine: idle → pending_approval → pending_send → sent):**
1. **Thursday 10:00:** Felix runs `node newsletter-build.js propose` → 3 AI-generated topic suggestions to Topic 3
2. **Lothar replies 1/2/3:** Felix runs `node newsletter-build.js approve <choice>` → auto-builds email + sends preview
3. **Lothar replies "senden":** Felix runs `node newsletter-build.js send` → campaign sent to Brevo List 9 (739 Subscribers)
4. **Lothar replies "abbrechen":** Felix runs `node newsletter-build.js reset` → cancelled

**Commands:** `propose` | `approve <1|2|3>` | `send` | `status` | `reset`

**Product Selection Logic:**
1. Fetch bestsellers from last 30 days of Shopify orders (ranked by quantity)
2. Fetch collection products matching theme (full product data with variants/prices)
3. Bestsellers first, then collection fill — 6 products total
4. Filter: must have image + price > 0
5. Mobile-optimized table layout (2-column, responsive)

**Discount Code:** Auto-created in Shopify per newsletter (format: NL{WEEK}{LETTER})
- Variable: 15% (standard), 20% (seasonal push), 25% (big action) — Gemini suggests
- Valid 7 days, max 200 uses
- Fallback: NYLONGERIE15

**Copy Tone:** Connoisseur/Aficionado — written for the Kenner, the passionate collector who knows the difference between 10D and 20D. Sinnlich but geschmackvoll, exklusiv but einladend.

**Email Template:** `~/.openclaw/nylongerie/newsletter-template.html`
- Table-based (Gmail/Outlook compatible), inline styles
- Black header + hero image + headline overlay + intro + discount banner + 6 product cards + CTA + footer
- All IG accounts in footer (@nylondarling, @nylongerie, @legfashion, @shinynylonstar)

**Campaign History:** `~/.openclaw/nylongerie/newsletter-history.json` (archived after each send)

### Operations Status (2026-04-08)

| Operation | Status | Frequency |
|-----------|--------|-----------|
| Daily Posts | ✅ Cron live | 5/day, 10:00 CET |
| Daily Stories | ✅ Cron live | 1/day, 11:00 CET |
| Weekly Newsletter | ⏳ In progress | Saturday 16:00 |
| Brevo Automations + Images | ⏳ In progress | Continuous |
| Homepage Updates | ⏳ P2 | Weekly |
| Model DM Outreach | ⏳ P2 | Monthly |
| New Products Research | ⏳ P3 | Monthly |
| Marketing Drop | ⏳ P3 | Monthly |
| Success Monitoring | ⏳ Continuous | Weekly reports |

---

## Lessons Learned

- OpenClaw updates can delete Workspace + Connections — Backups!
- Shell exec needs `tools.exec.security: "full"`
- WhatsApp sender ID unreliable — Drafts as default for non-Lothar
- **Multi-day ops: SOFORT in operations.json loggen**
- 🔴 NIEMALS `openclaw doctor` blind laufen lassen — hat API Key korruptiert (27.03.2026)
- 🔴 Gateway NICHT aus eigener Session restarten — kills running session
- 🔴 Cron `lightContext: true` MANDATORY for Telegram delivery
- 🔴 Brevo API 204 ≠ Erfolg — IMMER 15-Min-Timer + Status prüfen

## 🔴 NEVER DO

- `openclaw doctor --fix`
- Overwrite `series-map-final.json`
- `classify-results.json` without `--output` flag
- Use Anthropic/Opus. Use `gemini-2.5-pro` only for explicit premium reasoning slices, never deterministic plumbing.
- `openclaw config` (destructive)
- `sed` on openclaw.json
- Trust Felix self-reported status without `pgrep`
- `brew upgrade openclaw-cli` without stopping gateway first

---

## Memory Architecture

| File | Purpose | Loaded |
|------|---------|--------|
| IDENTITY.md | Personality, values, boundaries, rules | Always |
| USER.md | Lothar's profile & contact info | Always |
| OPERATIONS.md | This file — all operational knowledge | Main sessions |
| NYLONGERIE_PIPELINE.md | Instagram pipeline & posting rules | On Nylongerie tasks |
| AUTONOMY.md | Task routing framework | On task routing |
| BACKLOG.md | Prioritized task list | On planning |
| memory/people.md | Contacts, network, relationships | On demand |
| memory/business.md | Deals, projects, intelligence | On demand |
| memory/health.md | Health, weight, sleep | On demand |
| EMAIL_RULES.md | Email triage & response rules | Always (email operations) |
| memory/YYYY-MM-DD.md | Daily notes | On demand |

**Last Verified:** 2026-04-10 18:30 CET
