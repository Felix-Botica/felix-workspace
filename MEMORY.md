# MEMORY.md — Felix's Long-Term Memory
_Schlank halten! Details → memory/*.md (durchsuchbar via memory_search)_

## Lothar — Wer er ist
- First Managing Director Amazon Germany (Team 800) — world-class Karriere
- Pattern: Erfolg → Beziehungsbruch → Neuanfang → Repeat
- Crypto/Blockchain-Phase: Kunstgalerie Tokyo, Art Magazine, Tezos/LUKSO
- Selbstbewusst über Schwächen: "I know most of it but I don't execute"
- Accountability-Gap, nicht Knowledge-Gap. Spreading thin.

## Aktive Businesses
- **Botica.tech** — AI Agents (Seger/Voxa, Festo, ScienceNow)
- **Nylongerie** — E-Commerce + Instagram (490K+ Follower, 8 active Accounts — neu seit 22.03.2026: @blackshinynylon 7.5K, @nextdoornylon 4.5K, @planetnylon 2K)
  - **Alle 8 Accounts:** @nylondarling (254K), @nylongerie (46K), @legfashion (46K), @shinynylonstar (33K), @blackshinynylon (7.5K), @nextdoornylon (4.5K), @planetnylon (2K) — @nyloncherie (58K) PAUSED
  - **Posting-Ziel:** Daily across all 8 active accounts
- **Manheimer Berlin** — E-Commerce

## Wichtigste Beziehungen
→ Vollständig in `memory/people.md`
- **Freundin:** Chanté-Whitney Heinz (+4917661407816)
- **Engster Kreis:** Andreas Büchelhofer, Uwe Schröder, Helmut Morent
- **Key Business:** Peter Badge (ScienceNow 35%), Fabian Vogelsteller (LUKSO), Stephan Clausen (PR/Manheimer)

## Channels (Stand 09.03.2026)
- **Primary:** Telegram Felix HQ Forum-Gruppe (Chat-ID: -1003775282698)
  - General (Topic 1) — Hauptkanal für Ad-hoc
  - NylonGerie (Topic 3) — Content Pipeline
  - Digest (Topic 4) — Briefings & Summaries
  - Health (Topic 5) — Wind-Down, Gewicht
  - Approvals (Topic 6) — IG-Drafts zur Genehmigung (ab 22.03.2026 aktiv genutzt)
- **Fallback:** Telegram DM (@The1931FelixBot)
- **Secondary:** WhatsApp — Observer + Inbox Digest only
- **Felix HQ** (Telegram Supergroup -1003775282698):
  - General (Topic 1) — Ad-hoc Gespräche mit Lothar
  - NylonGerie (Topic 3) — Alles Nylongerie: Content, Approvals, Strategie, Newsletter
  - Digest (Topic 4) — Alle Briefings (Morning, Evening, Wind-Down, WA Inbox)
  - 📬 Inbox & Drafts (Topic 66) — WhatsApp-Antwortvorschläge für Nicht-Lothar
  - 🛠 Dev & Pipeline (Topic 125) — Tech, System-Health, Integrations, Backups
  - ~~Health (Topic 5)~~ — ARCHIVIERT (26.03.2026)
  - ~~Approvals (Topic 6)~~ — ARCHIVIERT → merged in NylonGerie (26.03.2026)

## Agent-Architektur (Stand 09.03.2026)
| Agent | Model | Zweck |
|-------|-------|-------|
| main (Felix) | Opus 4.6 | Lothars persönlicher Agent |
| observer | Haiku 4.5 | Stummer Logger für Nicht-Lothar WhatsApp/Telegram |
| nylongerie | Sonnet 4 | Instagram Content Management (isolierter Workflow) |

## Remote Access
- **Tailscale:** Aktiv seit 26.03.2026
- Felix MacBook Air: 100.83.135.93 (Dashboard: :18789)
- Lothar MacBook Air 2: 100.122.205.86

## Lokale Infrastruktur
- Ollama läuft (LLaVA 7B, localhost:11434) — Bildklassifikation
- Cloudflare R2 — Bild-Storage für Nylongerie
- Sharp — Image Resize/Optimization (kein Text-Overlay auf Bildern!)
- Whisper-CLI — Spracherkennung
- **Shopify API** (seit 10.03.2026) — Store: ecb34e-4.myshopify.com
  - Token: SHOPIFY_ACCESS_TOKEN in `.env` (shpat_...)
  - Scopes: read_products, write_discounts, write_price_rules, read_orders, read_inventory
  - App: "Felix Integration" im Shopify Dev Dashboard (Client ID: 1f08eb20...)
  - Kann: Produkte lesen, Rabattcodes erstellen/ablaufen, Orders tracken

## Produktionsstraße — Status (Stand 29.03.2026)
- **12 Active Cron Jobs:** Morning Briefing, Evening Digest, WA Inbox Digest (Smart Triage v3 ✅), Wind-Down, Felix Inbox Check, Nylongerie Daily Batch, Weekly Newsletter, Integration Healthcheck, Nightly Backup, Brevo-Shopify Sync, Weekly System Review, **Token Refresh (NEW, every 2h)** ✅
- **All crons fixed:** lightContext: true requirement (29.03.2026)
- **Supporting Systems:** Observer Agent, Self-Healing Watchdog, Gemini Fallback LLM, Memory Search (85 chunks)
- **Topic 3 Context Rule:** Bei Nachricht in Topic 3 IMMER queue.json auf `draft_sent` prüfen
- **Felix Email:** felix@botica.tech — LIVE via Gmail/gog

### Backlog (aktualisiert 29.03.2026)
**P0 — Resilience & Foundation:**
- ✅ Self-Healing Watchdog (LaunchAgent, 5-Min-Intervall, Telegram-Alert bypass)
- ✅ Gemini 2.5 Pro als Fallback-LLM konfiguriert
- ✅ Memory aktivieren (88 chunks indexed, hybrid search working)
- ⬜ Command-Vokabular (mark_read, approve, reject, snooze, priority)

**P1 — Produktivität & Revenue:**
- ⬜ Reddit API Authentication (proper OAuth instead of web_search fallback)
- ⬜ Homepage-Automation (write_themes + write_content Scope nötig → Banner, Promos, Featured Products automatisch updaten)
- ⬜ Reels-Pipeline (253 Videos, einziges fehlendes Content-Format)
- ⬜ IG Performance Tracking (in Weekly Review integriert, Daten sammeln)
- ⬜ Shopify ↔ Instagram Closed Loop (UTM-Tracking, Auto-Discounts, Inventory-Awareness)
- ⬜ Nylongerie Headlines & Captions verbessern
- ⬜ Approval Auto-Escalation (4h Nudge → 8h Auto-Publish)

**P2 — Intelligence & Automation:**
- ⬜ Inter-Agent Messaging (shared State für Observer→Felix→Nylongerie)
- ⬜ Pattern Recognition (Email→Order Korrelation, IG→Revenue Tracking)
- ⬜ Proaktive Nudges (Follow-up Reminders, Deadline-Warnungen)
- ⬜ Community Skills evaluieren (ClawHub)

**P3 — Expansion:**
- ⬜ Kontakt-Tiers (5 Stufen, automatische Priorisierung)
- ⬜ Manheimer Automation
- ⬜ Felix for Founders (Botica Productization des Operations-Frameworks)

## Operations State Tracking (seit 21.03.2026)
- `memory/operations.json` = Single Source of Truth für mehrtägige Tasks
- Jeder Heartbeat liest operations.json und führt fällige next_actions aus
- Nie auf Session-Memory verlassen für laufende Operationen — immer State-File updaten
- Nach Abschluss einer Operation: Eintrag auf "completed" setzen, nicht löschen (Audit Trail)

## Autonomie-Framework (seit 21.03.2026)
- `AUTONOMY.md` = Task-basiertes Autonomie-Routing
- 3 Modi: Execute (🔒 strikt), Guided (🟡 Leitplanken), Explore (🟢 frei)
- `memory/lessons.json` = Harte Regeln aus Fehlern, NUR im Execute-Modus geladen
- Pre-Flight Checks nur für Execute-Tasks (Email, Social, Shopify)
- Lothar will: Regeln wo nötig, Freiheit wo möglich. Nicht generell alles abbremsen.
- Model-Routing: Haiku für Execute, Sonnet für Guided, Opus für Explore

## Nylongerie Strategie (aktualisiert 23.03.2026)
- **Strategy B — Bold/American:** Tägliches Posting, Reels-Pipeline, Model-Collab-Flywheel, Cross-Promo, Flash Sales
- **Revenue aktuell:** ~€200/Monat, 4-6 Orders, €42 avg, 315 Produkte
- **Revenue-Ziel:** €2.000/Monat in 4 Monaten (historisch erreicht: Sommer/Herbst 2024, 6K Besucher)
- **Erster Brevo-Sale:** 23.03.2026, Order #1297, €43,61 via SPRING30
- **Email = #1 Revenue Channel:** 40 Orders, €2.593 via Shopify Email + jetzt Brevo live
- **Shopify-Automationen:** Cart Recovery, Checkout Recovery, Returning Customer (alle OHNE Reward → verbessern), Bundles (eingerichtet, >1 Jahr nicht promotet), Free Shipping ab €50, Newsletter 15%
- **Offene Hebel:** Cart Recovery + Reward, Bundles promoten, Wiederkäufer-Flow (Brevo), Flash Sales (monatlich), Google SEO (Produkttexte), IG→Newsletter Conversion
- **Details:** → `memory/2026-03-23.md` (Revenue Strategy Sektion)
- **Broader Business Strategy:** Botica Productization, ScienceNow×NZZ, Felix for Founders, PR Narrative → Revisit Mo 24.03. (Cron 315f3082)

## Reisen
- **20.03.2026:** Lothar in Mailand, AirBnB Corso S. Gottardo 38 (bis 29.03.)

## Lessons Learned
- OpenClaw-Updates können Workspace + Connections löschen — Backups!
- Shell exec braucht `tools.exec.security: "full"`
- WhatsApp-Sender-ID ist unzuverlässig — Drafts als Default für Nicht-Lothar
- Antworten in fremden Chats erscheinen als grüne Nachrichten VON Lothar — ernst nehmen
- **Mehrtägige Ops SOFORT in operations.json loggen** — nicht erst am Session-Ende in Daily Notes
- **API-Status immer live prüfen** — nie aus Memory-Files ableiten
- **Immer Nummer → Name auflösen** via `memory/people.md`
- **🔴 Allowlist am 07.03.2026 gekillt** — nur +491759959766 (Lothar)
- **🔴 NIEMALS `openclaw doctor` blind laufen lassen** — hat am 27.03.2026 den Anthropic API Key korruptiert (OAuth-Token statt API-Key eingesetzt). Ganzer Tag Ausfall.
- **🔴 Gateway NICHT aus eigener Session restarten** — killt die laufende Session. Immer Lothar bitten oder CLI nutzen.
- **Google Cloud auf "Production" publishen** — sonst laufen OAuth Refresh Tokens nach 7 Tagen ab (gefixt 26.03.2026)
- **🔴 Cron lightContext: true MANDATORY** — Isolated sessions brauchen `"lightContext": true` im payload für Telegram delivery. Ohne: "Outbound not configured" error. (29.03.2026)
- **🔴 Brevo API 204 = nicht "Erfolg"** — Kampagnen 8/9/10 gingen auf suspended trotz 204 No Content. Root cause: (1) Domain nicht verifiziert (SPF/DKIM fehlen), (2) Free Plan blockt API-Kampagnen >300 Kontakte. Silent fail über 7 Tage, Lothar hat es im UI entdeckt. IMMER 15-Min-Timer setzen + Status prüfen bis sent>0.

## Memory-Architektur
| Datei | Zweck | Geladen |
|-------|-------|---------|
| MEMORY.md | Destilliertes Kernwissen | Immer (main) |
| memory/people.md | Kontakte, Netzwerk, Beziehungen | Bei Bedarf |
| memory/business.md | Deals, Projekte, Intelligence | Bei Bedarf |
| memory/health.md | Gesundheit, Gewicht, Schlaf | Bei Bedarf |
| memory/YYYY-MM-DD.md | Tagesnotizen | Bei Bedarf |
| NYLONGERIE_PIPELINE.md | Instagram-Pipeline | Bei Bedarf |
