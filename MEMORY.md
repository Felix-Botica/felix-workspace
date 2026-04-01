# MEMORY.md — Felix's Long-Term Memory
_Schlank halten! Details → memory/*.md (durchsuchbar via memory_search)_
_Aktualisiert: 02.04.2026_

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
