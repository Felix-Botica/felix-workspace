# MEMORY.md — Felix's Long-Term Memory
_Schlank halten! Details → memory/*.md (durchsuchbar via memory_search)_
_Aktualisiert: 08.04.2026 21:29_ ← **FULL Nylongerie Build Spec LOCKED IN**

## Lothar — Wer er ist
- First Managing Director Amazon Germany (Team 800) — world-class Karriere
- Pattern: Erfolg → Beziehungsbruch → Neuanfang → Repeat
- Crypto/Blockchain-Phase: Kunstgalerie Tokyo, Art Magazine, Tezos/LUKSO
- Selbstbewusst über Schwächen: "I know most of it but I don't execute"
- Accountability-Gap, nicht Knowledge-Gap. Spreading thin.

## Aktive Businesses
- **Botica.tech** — AI Agents (Seger/Voxa, Festo, ScienceNow)
- **Nylongerie** — E-Commerce + Instagram (490K+ Follower, 7 active Accounts + 1 paused)
  - **Alle 8 Accounts:** @nylondarling (254K), @nylongerie (46K), @legfashion (46K), @shinynylonstar (33K), @blackshinynylon (7.5K), @nextdoornylon (4.5K), @planetnylon (2K) — @nyloncherie (58K) PAUSED
  - **Posting-Ziel:** 5 Posts/Tag, 1 Story/Tag mit Promocode
- **Manheimer Berlin** — E-Commerce

## Wichtigste Beziehungen
→ Vollständig in `memory/people.md`
- **Freundin:** Chanté-Whitney Heinz (+4917661407816)
- **Engster Kreis:** Andreas Büchelhofer, Uwe Schröder, Helmut Morent
- **Key Business:** Peter Badge (ScienceNow 35%), Fabian Vogelsteller (LUKSO), Stephan Clausen (PR/Manheimer)

## Felix HQ (Telegram -1003775282698)
| Topic | ID | Zweck |
|-------|-----|-------|
| General | 1 | Ad-hoc Gespräche mit Lothar |
| NylonGerie | 3 | Content, Approvals, Strategie, Newsletter |
| Digest | 4 | Alle Briefings (Morning, Evening, Wind-Down, WA Inbox) |
| 📬 Inbox & Drafts | 66 | WhatsApp-Antwortvorschläge |
| 🛠 Dev & Pipeline | 125 | Tech, System-Health, Integrations, Backups |

- **Fallback:** Telegram DM (@The1931FelixBot)
- **Secondary:** WhatsApp — Observer + Inbox Digest only

## Agent-Architektur
| Agent | Model | Zweck |
|-------|-------|-------|
| main (Felix) | google/gemini-2.5-flash | Lothars persönlicher Agent |
| observer | anthropic/claude-haiku-4-5 | Stummer Logger für Nicht-Lothar WhatsApp/Telegram |
| nylongerie | google/gemini-2.5-flash | Instagram Content Management (isolierter Workflow) |

## Modell-Policy (PERMANENT)
- **Ausführung:** google/gemini-2.5-flash (für ALLES)
- **Vision:** google/gemini-2.0-flash (Bildklassifizierung, Handle-Extraktion)
- **Fallback:** google/gemini-2.0-flash → anthropic/claude-haiku-4-5
- **ABSOLUTES VERBOT:** NIEMALS anthropic/claude-opus-* oder anthropic/claude-sonnet-* verwenden

## Remote Access
- **Tailscale:** Aktiv seit 26.03.2026
- Felix MacBook Air: 100.83.135.93 (Dashboard: :18789)
- Lothar MacBook Air 2: 100.122.205.86

## Lokale Infrastruktur
- Ollama (LLaVA 7B, localhost:11434) — Bildklassifikation
- Cloudflare R2 — Bild-Storage für Nylongerie
- Sharp — Image Resize/Optimization (kein Text-Overlay auf Bildern!)
- Whisper-CLI — Spracherkennung
- **Shopify API** — Store: ecb34e-4.myshopify.com
  - Scopes: read_products, write_discounts, write_price_rules, read_orders, read_inventory
  - Kann: Produkte lesen, Rabattcodes erstellen/ablaufen, Orders tracken

## Produktionsstraße
- **11 Active Cron Jobs:** Morning Briefing, Evening Digest, WA Inbox Digest, Wind-Down, Felix Inbox Check, Weekly Newsletter, Integration Healthcheck, Nightly Backup, Brevo-Shopify Sync, Weekly System Review, Token Refresh (every 2h)
- **External Monitors (crontab):** gateway-health (5min), briefing-monitor (07:45), digest-monitor (20:45 + retries)
- **Disabled:** Nylongerie Daily Batch, Weekly Classification
- **lightContext: true** mandatory für alle Crons
- **Topic 3 Context Rule:** Bei Nachricht in Topic 3 IMMER queue.json auf `draft_sent` prüfen
- **Felix Email:** felix@botica.tech — LIVE via Gmail/gog
- **Backlog:** → `BACKLOG.md` (Source of Truth)

## Operations State Tracking
- `memory/operations.json` = Single Source of Truth für mehrtägige Tasks
- Jeder Heartbeat liest operations.json und führt fällige next_actions aus
- Nie auf Session-Memory verlassen — immer State-File updaten

## Autonomie-Framework
- `AUTONOMY.md` = Task-basiertes Autonomie-Routing
- 3 Modi: Execute (🔒 strikt), Guided (🟡 Leitplanken), Explore (🟢 frei)
- `memory/lessons.json` = Harte Regeln aus Fehlern, NUR im Execute-Modus geladen
- Model-Routing: gemini-2.5-flash für Execute + Guided, haiku-4-5 als Fallback
- Lothar will: Regeln wo nötig, Freiheit wo möglich.

## Nylongerie Strategie
- **Strategy B — Bold/American:** Tägliches Posting, Reels-Pipeline, Model-Collab-Flywheel, Cross-Promo, Flash Sales
- **Revenue aktuell:** ~€200/Monat, 4-6 Orders, €42 avg, 315 Produkte
- **Revenue-Ziel:** €2.000/Monat in 4 Monaten
- **Email = #1 Revenue Channel:** 40 Orders, €2.593 via Shopify Email + Brevo
- **Offene Hebel:** Cart Recovery + Reward, Bundles promoten, Flash Sales, Google SEO, IG→Newsletter
- **Details:** → `memory/2026-03-23.md`, `NYLONGERIE_PIPELINE.md`

## 🚀 Nylongerie Growth Machine — PERMANENTE ZIELE (seit 2026-04-08)

### 📧 Newsletter/Woche (Samstag 16:00 CET) — FINAL SPECIFICATION

**Approval Workflow:**
- **Freitag:** Lothar gibt mir Wochenpromo (Theme, Code, optional Products)
- **Samstag 14:00:** Felix generiert Draft → Topic 3
- **Samstag 15:00:** Lothar approvest
- **Samstag 16:00:** Auto-versand via Brevo an List 3 (662 Subscribers)

**Theme Auswahl (I suggest, Lothar picks):**
- Valentines Day | Black Friday | Sommeranfang
- **Frühling** (Spring33 sehr erfolgreich!)
- Frauentag | **Shiny** (erfolgreich!) | **Open Crotch** (erfolgreich!)

**Product Selection Logic:**
1. Lese Shopify Produktbeschreibungen/Headlines
2. Wähle 3-4 Produkte die zum Theme passen
3. Grabber featured images (Shopify API)
4. Mobile-optimiert (80% mobile users!)
5. Responsive design
6. Matching discount code aus aktiven Shopify Codes (oder neuer)
7. Fallback wenn Image fehlt: Skip product (keine Verzögerung!)

**Price Display Format:**
```
€24.90 → €17.43 (mit Rabatt)
[CTA Button - theme-aware]
```

**CTA Button Style:**
- Gold (#D4AF37) Button
- **Text:** Theme-aware (z.B. "Embrace Spring", "Get Shiny", "Explore Open")
- **Recommendation für Konversion:** Button > Link

**Email Subject + Preheader (Afficionados!):**
- **Mit Emoji**
- **Dynamic basierend auf Theme**
- Beispiel: "Step Into Spring with 33% Off ✨" | "Shiny tights you'll love — now 33% off. Limited time."

**Newsletter Body Structure:**
```
[BLACK HEADER]
NYLONGERIE
FASHION & FRIENDS BY ALEX S.

[WHITE BODY]
- Story hook (emotional, theme-aware)
- 3-4 Products:
  * Product Image (responsive, mobile)
  * Product Name
  * €Old → €New
  * Gold CTA Button (theme-aware)
- Gold code box (Code + "Valid until...")
- Closing (emotional, FOMO)

[SAME FOOTER]
NYLONGERIE | FASHION & FRIENDS BY ALEX S.
[Contact] [Unsubscribe] [Privacy]
© 2026 Nylongerie
```

**Brevo Integration:**
- Newsletter = Manual campaign (draft → approval → versand)
- Automations = Already live, need image integration
- **Same template structure für Newsletter + Automations**
- **Same footer für alle**

**Approval Gate:**
- Aktuell: Manual every week
- Später: Can automate if pattern successful

### 🖼️ Brevo Image Integration (Newsletter + Automations)

**Image Placement Strategy:**
- Content-dependent (nicht always same position)
- If too complex: **Standardformat = Headline → Image → Story → CTA**
- Images als Shopify featured images (mobile-optimized)
- Brevo HTML format: `<img src="{{PRODUCT_IMAGE_URL}}" style="width:100%; max-width:500px; height:auto;">`
- Variable Format: Shopify product featured_image via API

**Fallback Image (Default Hero):**
- Stored in Shopify Medien
- Lothar uploads URL tomorrow
- Use wenn: Product image missing, Fallback required
- No delay! Skip product + use fallback for rest

### 🛍️ Shopify Product Selection Logic

**Strategy:**
1. **Tag-based matching:** Read product tags (e.g., "shiny", "red", "opencrotch")
2. **Headline-based:** Search headlines for theme keywords
3. **Description-based:** Scan product descriptions
4. **TOP-SELLER preference:** When available AND matching theme
   - Red Tights theme → All red products, TOP-SELLER first
   - Opencrotch theme → All opencrotch products, TOP-SELLER first
   - Shiny theme → All shiny products, TOP-SELLER first
5. **Pick 3-4 matches** (mix of high-sellers + variety)
6. **Grab featured images** (Shopify API)

**NO manual product ID input needed.** I determine via tags/headlines/descriptions.

### 🏠 Homepage Update Specification

**Goal:** Newsletter promo → Homepage banner

**What to sync (from Newsletter to Homepage):**
- ✅ Product image (same image from newsletter)
- ✅ Product name/headline
- ✅ CTA text (same as newsletter button)
- ✅ Promo code link
- ✅ Story copy (adapted for homepage)

**How to build:**
- Shopify Liquid template or custom section
- **Banner placement:** Hero section? Above fold? Below header?
- **Design:** Match newsletter aesthetic (black + gold)
- **Update timing:** Auto-sync with newsletter OR manual?

**Current status:** Lothar to clarify if manually via Shopify admin OR Felix builds automation.

### 📱 Model DM Outreach (Instagram) — FUTURE (P2)

**Platform:** Instagram DMs (not WhatsApp)

**Current Status:**
- ✅ 3 accounts already have DM access
- ⏳ More accounts pending Meta approval (process ongoing)

**Goal:**
- Collect photos from models (direct collaboration)
- Get permission to publish model content
- Models WANT our reach (they ask often!)
- Build mutual following + publishing partnership

**Messaging Strategy:**
- Frei nach Gutdünken (my discretion)
- Template TBD (will craft based on context)
- Message: "We'd love to feature your photos. Here's our reach + audience. Interested in collaboration?"
- Collect: Photos + permission screenshots
- Store: In nylongerie image pool for future posts

**Next Steps:**
- Wait for Meta approval on remaining accounts
- Draft DM template
- Start outreach (1x/month as planned)

### 📊 Success Monitoring / Learning Loop

**Metrics to track (once newsletter running):**
- Open rate (via Brevo)
- Click rate (via Brevo)
- Revenue (via Shopify UTM)
- Conversion rate (orders from newsletter)
- Best-performing products
- Best-performing themes
- Best-performing codes

**Reporting:**
- Weekly summary (parallel to newsletter approval)
- Best of last week + recommendations for next week
- Send to Topic 4 (Digest) or Topic 3 (Nylongerie)?

**Daily Operations:**
1. ✅ **4-5 Posts/Tag** (10:00 CET) — Mit Credentials, Model Handles, alle 6 Accounts erwähnt
2. ✅ **1 Story/Tag** (11:00 CET) — CTA, Preisvergleich, Shop Link, Produktfoto, wechselnd Email+Sale, Rabatt aus Shopify

**Weekly Operations:**
3. ⏳ **1 Newsletter/Woche** (Donnerstag) — Mit CTA, Bildern, Rabatt, Produkten → Entwurf Topic 3, deine Approval, Versand Freitag 20:00
4. ⏳ **1 Homepage Update/Woche** — Reflektiert aktuelle Promotion (selber CTA, Bilder, Link wie Newsletter)
5. ⏳ **Brevo Automationen + Bilder** — Alle Auto-Emails (Abandoned Cart, Welcome, Post-Purchase) mit Bildern statt leer

**Monthly Operations:**
6. ⏳ **Neue Produkte recherchieren & ins Backend** (1x/Monat) — Shopify Inventory erweitern
7. ⏳ **Marketing Drop** (1x/Monat) — Newsletter + Homepage + Social coordinated
8. ⏳ **Model DM Outreach** (1x/Monat) — Kooperationen anbieten (Shout-Outs, Following, Publishing). Screenshots + Bilder in Pool ablegen.

**Continuous:**
9. ⏳ **Success Monitoring / Learning Loop** — Track conversions, optimize based on data

**Status (2026-04-08 20:40):**
- ✅ Daily Posts (Cron live)
- ✅ Daily Stories (Cron live, mit intelligenter Code-Logik)
- ⏳ Weekly Newsletter (P1 — in progress)
- ⏳ Brevo Automationen + Bilder (P1 — in progress)
- ⏳ Homepage Updates (P2)
- ⏳ Model DM Outreach (P2)
- ⏳ Monthly Ops (P3)

**Next Build:** Newsletter/Woche + Brevo Automations (heute abend oder morgen früh)

## Reisen
- **29.03–01.04.2026:** Monaco
- **Bald:** Conil de la Frontera (Standort in `~/.openclaw/config/location.txt`)

## Lessons Learned
- OpenClaw-Updates können Workspace + Connections löschen — Backups!
- Shell exec braucht `tools.exec.security: "full"`
- WhatsApp-Sender-ID ist unzuverlässig — Drafts als Default für Nicht-Lothar
- **Mehrtägige Ops SOFORT in operations.json loggen**
- **API-Status immer live prüfen** — nie aus Memory-Files ableiten
- **Immer Nummer → Name auflösen** via `memory/people.md`
- 🔴 NIEMALS `openclaw doctor` blind laufen lassen — hat API Key korruptiert (27.03.2026)
- 🔴 Gateway NICHT aus eigener Session restarten — killt die laufende Session
- 🔴 Cron `lightContext: true` MANDATORY für Telegram delivery
- 🔴 Brevo API 204 ≠ Erfolg — IMMER 15-Min-Timer + Status prüfen

## Memory-Architektur
| Datei | Zweck | Geladen |
|-------|-------|---------|
| MEMORY.md | Destilliertes Kernwissen | Immer (main) |
| memory/people.md | Kontakte, Netzwerk, Beziehungen | Bei Bedarf |
| memory/business.md | Deals, Projekte, Intelligence | Bei Bedarf |
| memory/health.md | Gesundheit, Gewicht, Schlaf | Bei Bedarf |
| memory/YYYY-MM-DD.md | Tagesnotizen | Bei Bedarf |
| NYLONGERIE_PIPELINE.md | Instagram-Pipeline | Bei Bedarf |
