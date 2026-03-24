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
  - General (Topic 1) — Allgemein
  - NylonGerie (Topic 3) — Instagram Content
  - Approvals — Genehmigungen
  - Health — Gesundheit
  - Digest — Zusammenfassungen
  - 📬 Inbox & Drafts (Topic 66) — WhatsApp-Drafts & Antwortvorschläge
  - 🛠 Dev & Pipeline (Topic 125) — Technische Entwicklung & Research

## Agent-Architektur (Stand 09.03.2026)
| Agent | Model | Zweck |
|-------|-------|-------|
| main (Felix) | Opus 4.6 | Lothars persönlicher Agent |
| observer | Haiku 4.5 | Stummer Logger für Nicht-Lothar WhatsApp/Telegram |
| nylongerie | Sonnet 4 | Instagram Content Management (isolierter Workflow) |

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

## Produktionsstraße — Status
- **Live:** Morning Briefing, WA Inbox Digest (21:00), X Digest, Wind-Down, Observer, LinkedIn Summary (via Email), Reddit im Evening Digest ✅, Stories-Pipeline ✅ (Templates v3, manueller Publish mit Link-Sticker)
- **In Arbeit:** Nylongerie Sub-Agent optimieren & testen (Posts)
- **In Arbeit:** Reels-Pipeline (253 Videos vorhanden, nächster Schritt), Shopify connected (ecb34e-4)
- **Topic 3 Context Rule:** Bei Nachricht in Topic 3 IMMER queue.json auf `draft_sent` prüfen — Session-Resets egal (eingeführt 15.03.2026)
- **P0 Next:** Nightly Backup (GitHub Account vorhanden)
- **Felix Email:** felix@botica.tech — LIVE, kann senden + empfangen via Gmail/gog (eingerichtet zusammen mit GitHub Account ~12.03.2026)
- **P1 Next:** Nylongerie CRM Workflow (Shopify Email-Kampagnen an Bestandskunden — 2. größte Umsatzquelle nach Stories)
- **P1 Next:** Reels-Pipeline (253 Videos vorhanden — einziges fehlendes Content-Format)
- **P1 Backlog:** Community Skills evaluieren (ClawHub), Nylongerie Headlines & Captions verbessern
- **P2 Backlog:** Inter-Agent Messaging (shared State-File für Observer→Felix Tasks, inspiriert von "My Brain Is Full Crew"), Connector-Agent (periodischer Memory-Scan auf unentdeckte Zusammenhänge), Memory Plugin (ClawVault/Supermemory), Product Tags (IG Shopping), Instagram Performance Tracking, Gewicht-Auto
- **P3 Backlog:** Kontakt-Tiers, Manheimer Automation, Email Auto-Triage

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
- **Mehrtägige Ops SOFORT in operations.json loggen** — nicht erst am Session-Ende in Daily Notes. Session kann jederzeit enden.
- **API-Status immer live prüfen** — nie aus Memory-Files ableiten ob etwas gesendet wurde oder nicht.
- **Immer Nummer → Name auflösen** via `memory/people.md` bevor Draft formuliert wird. "Draft für Chanté", nicht "Draft für +49...". Kontext des Kontakts hilft bei besseren Antwortvorschlägen.
- **🔴 Allowlist am 07.03.2026 gekillt** — zu viele Leaks (Alexander Tramm, Annika von Taube, Peter Badge). Nur noch +491759959766 (Lothar). Muss sicher neu aufgebaut werden bevor andere Nummern wieder reinkommen.

## Memory-Architektur
| Datei | Zweck | Geladen |
|-------|-------|---------|
| MEMORY.md | Destilliertes Kernwissen | Immer (main) |
| memory/people.md | Kontakte, Netzwerk, Beziehungen | Bei Bedarf |
| memory/business.md | Deals, Projekte, Intelligence | Bei Bedarf |
| memory/health.md | Gesundheit, Gewicht, Schlaf | Bei Bedarf |
| memory/YYYY-MM-DD.md | Tagesnotizen | Bei Bedarf |
| NYLONGERIE_PIPELINE.md | Instagram-Pipeline | Bei Bedarf |
