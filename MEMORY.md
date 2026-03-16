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
- **Nylongerie** — E-Commerce + Instagram (437K Follower, 5 Accounts)
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
  - Approvals (Topic 6) — Wartet auf OK
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
- **Live:** Morning Briefing, WA Inbox Digest (21:00), X Digest, Wind-Down, Observer, LinkedIn Summary (via Email)
- **In Arbeit:** Nylongerie Sub-Agent optimieren & testen (Posts)
- **In Arbeit:** Stories-Pipeline (technisch ✅, Text-Overlay-Templates noch offen), Shopify connected (ecb34e-4)
- **Topic 3 Context Rule:** Bei Nachricht in Topic 3 IMMER queue.json auf `draft_sent` prüfen — Session-Resets egal (eingeführt 15.03.2026)
- **P0 Next:** Nightly Backup (GitHub Account vorhanden)
- **Felix Email:** felix@botica.tech — LIVE, kann senden + empfangen via Gmail/gog (eingerichtet zusammen mit GitHub Account ~12.03.2026)
- **P1 Next:** Nylongerie CRM Workflow (Shopify Email-Kampagnen an Bestandskunden — 2. größte Umsatzquelle nach Stories)
- **P1 Backlog:** Community Skills evaluieren (ClawHub), Nylongerie Headlines & Captions verbessern, Reels-Pipeline (253 Videos vorhanden!), Reddit im Evening Digest
- **P2 Backlog:** Memory Plugin (ClawVault/Supermemory), Product Tags (IG Shopping), Instagram Performance Tracking, Gewicht-Auto
- **P3 Backlog:** Kontakt-Tiers, Manheimer Automation, Email Auto-Triage

## Lessons Learned
- OpenClaw-Updates können Workspace + Connections löschen — Backups!
- Shell exec braucht `tools.exec.security: "full"`
- WhatsApp-Sender-ID ist unzuverlässig — Drafts als Default für Nicht-Lothar
- Antworten in fremden Chats erscheinen als grüne Nachrichten VON Lothar — ernst nehmen
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
