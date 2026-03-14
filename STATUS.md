# STATUS.md — Felix System Status
*Last updated: 2026-03-12*

## Hardware
- MacBook Air M1 running permanently as server via Amphetamine
- OpenClaw CLI v2026.3.8 (Homebrew)
- Model: Claude Opus 4.6 (Anthropic Max subscription, OAuth)

## Skills — Working ✅

### Communication
- **Gmail** — Read, search, compose, send via `gog` CLI (LotharEckstein@gmail.com)
- **Gmail "Send as"** — Replies go out as correct sender (Botica ✅, iCloud ✅)
- **Email forwarding** — Botica (l.eckstein@botica.tech) + iCloud (l.e@me.com) → Gmail ✅
- **Google Calendar** — Read events, detect conflicts, create appointments
- **WhatsApp** — Read/write, selfChatMode (only to/from Lothar's +491759959766)
- **Telegram** — Connected via @The1931FelixBot, Felix HQ Forum-Gruppe als Hauptkanal
- **X/Twitter** — Read timeline, check mentions, post/reply/thread (@lothareckstein)

### Instagram (Nylongerie)
- **Read** — All 5 core accounts + 3 others via Meta Graph API
- **Publish Feed** — Single image + carousel on all 5 accounts ✅
- **Publish Stories** — Image + Link Sticker via API ✅ (text overlay via Sharp/SVG)
- **Publish Reels** — Supported via API (253 Videos vorhanden, Pipeline noch nicht gebaut)
- **Cannot do** — Delete posts, add music, polls/countdown stickers in Stories
- **Accounts:** @nylondarling (254K), @nyloncherie (58K), @nylongerie (46K), @legfashion (46K), @shinynylonstar (34K)

### Shopify (Nylongerie) — NEU ✅
- **Store:** ecb34e-4.myshopify.com (nylongerie.com)
- **App:** "Felix Integration" (Client ID: 1f08eb20...)
- **Scopes:** read_products, write_discounts, write_price_rules, read_orders, read_inventory
- **Kann:** Produkte lesen, Collections browsen, Rabattcodes erstellen + Ablaufdatum setzen, Orders tracken
- **Discount-Links:** `nylongerie.com/discount/CODE` → Rabatt automatisch im Warenkorb ✅
- **Credentials:** SHOPIFY_ACCESS_TOKEN in `~/.openclaw/.env`

### Health & Data
- **Withings** — Sleep data, heart rate, SpO2, body temp (auto-refreshing tokens)
- **Weight** — Manual tracking via WhatsApp (logged to memory/health-weight.md)

### Infrastructure
- **Shell access** — Full (tools.exec.security: "full")
- **Cloudflare R2** — Image hosting (bucket: nylongerie-media, public URL via pub-*.r2.dev)
- **Sharp** — Image resize/overlay/SVG rendering (workspace/node_modules)
- **@aws-sdk/client-s3** — R2 uploads via Node.js (workspace/node_modules)
- **Fonts** — DancingScript (Script) + Montserrat (Bold Sans-Serif) in ~/.openclaw/fonts/
- **Ollama** — LLaVA 7B (localhost:11434) für Bildklassifikation
- **Whisper-CLI** — Spracherkennung (whisper-cpp v1.8.3, base model)
- **Cron jobs** — Morning briefing 07:30, WA Digest 21:00, Wind-Down 23:00, X Digest 20:00
- **Web search/fetch** — Brave Search API

## Nylongerie — Pipelines

### Feed-Posts (end-to-end working ✅)
1. **Intake** — Photos in ~/Desktop/nylongerie-content/inbox/ (~1600 files, 100 klassifiziert)
2. **Classify** — Vision API: screenshots vs content, @handles extrahieren
3. **Pair** — Screenshots ↔ Content Photos (IMG-Nummernsequenz)
4. **Assign** — Stilklassifikation → Account (editorial→@nylondarling, elegant→@nyloncherie, legs→@legfashion, shiny→@shinynylonstar, product→@nylongerie)
5. **Overlay** — Sharp: Gradient CTA-Banner, Model Credit, Headline
6. **Caption** — Model-Mention, Hashtags, CTA, Copyright
7. **Upload** — R2 für public URL
8. **Publish** — Instagram Graph API: container → wait → publish
9. **Track** — Geplant, noch nicht gebaut

### Stories + Shopify (end-to-end Dry Run ✅, Template-Engine in Arbeit)
1. **Anlass wählen** — Sale, Bestseller, MOTW, Season, Category
2. **Produkt/Collection aus Shopify** — Produktbild + Preis automatisch
3. **Shopify Discount erstellen** — Price Rule + Discount Code + Ablaufdatum (API)
4. **Story-Bild generieren** — Sharp/SVG: Produktfoto + Script-Headline + Preis/Rabatt + CTA + Branding
5. **Upload** — R2 Preview
6. **Approval** — Lothar gibt OK
7. **Publish** — Instagram Stories API mit Link Sticker → `nylongerie.com/discount/CODE`
- **Status:** Dry Run SHINY30 erfolgreich ✅, Template-Engine wird bis Freitag gebaut
- **Ziel:** Samstag 14.03. erste Live-Story

### Reels (geplant, nicht gebaut)
- 253 Videos vorhanden, ungesichtet
- API unterstützt Reels (video_url + media_type=REELS)
- Braucht: Video-Sichtung, ffmpeg-Processing, Caption-Anpassung

## Cron Jobs — Aktiv

| Job | Zeit | Kanal | Inhalt |
|-----|------|-------|--------|
| Morning Briefing | 07:30 CET | WhatsApp | Email + Kalender + Schlaf + Gewicht |
| X Evening Digest | 20:00 CET | Telegram | Mentions, Trends |
| WA Inbox Digest | 21:00 CET | Telegram | Nicht-Lothar WhatsApp Nachrichten |
| Wind-Down | 23:00 CET | WhatsApp | Schlaf-Nudge |
| Nylongerie Batch | 10:00 CET | Telegram | Feed-Post Pipeline (Sub-Agent) |

## Agents

| Agent | Model | Zweck | Status |
|-------|-------|-------|--------|
| Felix (main) | Opus 4.6 | Persönlicher Agent, Orchestrator | ✅ Live |
| Observer | Haiku 4.5 | Stummer Logger (WhatsApp/Telegram DMs) | ✅ Live |
| Nylongerie | Sonnet 4 | Instagram Content Management | 🟡 Grundstruktur, erster Lauf ausstehend |

## In Progress 🟡

- [ ] **Story Template-Engine** — 5 Typen (Sale, Product, MOTW, Season, Category) als wiederverwendbare Templates → Deadline: Freitag 14.03.
- [ ] **GitHub Account für Felix** — Nightly Backup aller Configs, Skills, Memory
- [ ] **Eigene Email für Felix** — z.B. felix@botica.tech
- [ ] **Community Skills evaluieren** — ClawHub durchschauen

## Not Yet Done

- [ ] Instagram Performance Tracking & Analytics
- [ ] Reels-Pipeline (253 Videos!)
- [ ] Email-Kampagnen (Shopify Email, 700 Kunden)
- [ ] Batch Processing remaining ~1500 images
- [ ] Contact tier system
- [ ] Email auto-triage / smart replies
- [ ] Reddit im Evening Digest
- [ ] Gewicht-Automatisierung (Renpho → Apple Health → Felix)
- [ ] Manheimer Berlin Automation
- [ ] Product Tags (IG Shopping)
- [ ] Memory Plugin evaluieren (ClawVault/Supermemory)

## Credentials Location
All API keys/tokens stored in `~/.openclaw/.env`:
- X/Twitter (consumer + access tokens + bearer)
- Withings (client ID/secret, access/refresh tokens — auto-refresh on 401)
- Anthropic API key
- Cloudflare R2 (account ID, access key, secret, endpoint, bucket, public URL)
- Meta/Instagram (permanent system user token)
- Shopify (store, client ID/secret, access token)

## Telegram Felix HQ (Chat-ID: -1003775282698)

| Topic | ID | Zweck |
|-------|-----|-------|
| General | 1 | Hauptkanal, Ad-hoc |
| NylonGerie | 3 | Content Pipeline |
| Digest | 4 | Briefings & Summaries |
| Health | 5 | Wind-Down, Gewicht |
| Approvals | 6 | Wartet auf OK |
| 📬 Inbox & Drafts | 66 | WhatsApp-Drafts |
| 🛠 Dev & Pipeline | 125 | Technische Entwicklung |
