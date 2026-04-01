# BACKLOG.md — Felix Produktionsstraße
_Was läuft, was kommt, was wartet. Priorisiert nach Impact._

## 🟢 LIVE (funktioniert)

### Morning Briefing (07:30 CET)
- Email-Scan (actionable vs noise), Kalender, Gewicht (manuell), Schlaf (Withings)
- **Offen:** Wetter einbauen, LinkedIn-Mentions

### WA Inbox Digest (21:00 CET)
- Eingehende WhatsApp-Nachrichten, Kontakt-Auflösung via people.md
- **Limitation:** Lothars eigene Antworten nicht sichtbar (fromMe-Routing fehlt)

### Wind-Down (23:00 CET) + X Digest (20:00 CET)
- Schlaf-Nudge + Twitter Mentions/Trends

### Observer Agent (Haiku 4.5)
- Stummer Logger, kein Leak, NO_REPLY only

### Nylongerie Feed-Posts
- Komplette Pipeline: Classify → Pair → Assign → Overlay → Caption → R2 → Publish
- 100/1600 Bilder klassifiziert

### Shopify Integration ✅ NEU
- Produkte lesen, Collections browsen, Discount Codes erstellen (API)
- Discount-Links: `nylongerie.com/discount/CODE` → automatisch angewendet

## 🟡 IN ARBEIT

### Nylongerie Story-Pipeline → Deadline: SA 14.03. 🎯
**Status:** End-to-End Dry Run ✅, Template-Engine wird gebaut

**Anlässe (Template-Typen):**
| Typ | Beispiel | Frequenz |
|-----|----------|----------|
| **Flash Sale** | "30% off Shiny Tights, 48h only" | 2-3x/Woche |
| **Bestseller** | Top-Produkt mit Preis featuren | 1x/Woche |
| **New Arrivals** | Neue Produkte im Shop | Bei Bedarf |
| **Bundle/Multipack** | "Save with our multipacks" | 1x/Woche |
| **Model of the Week** | Persönlicher Code (WILLEKE20) | 1x/Woche |
| **Category Spotlight** | "Discover our Opaque Collection" | 1-2x/Woche |
| **Saisonal** | Valentine's, Spring, Summer, Xmas | Kalender-driven |

**Flow:** Anlass → Shopify Produkt/Collection + Discount Code → Sharp Story-Bild → Approval → IG Story + Link Sticker

**Nächste Schritte:**
- [ ] Template-Engine bauen (5 SVG-Varianten)
- [ ] 2-3 fertige Stories zur Freigabe (Freitag)
- [ ] Erster Live-Post auf @nylongerie (Samstag)

### GitHub Account für Felix
- Nightly Backup: Configs, Skills, Memory, Pipeline-Scripts
- **Status:** In Progress

### Eigene Email für Felix
- z.B. felix@botica.tech
- **Status:** Backlog

## 🔴 BACKLOG (priorisiert nach Impact)

### P1 — Umsatz-Impact

#### Nylongerie: Email-Kampagnen
- 700 Kunden, 3% Conversion (10x Social!)
- Shopify Email — Top-Performer, saisonale Kampagnen
- **Braucht:** Template-System, Performance-Tracking

#### Nylongerie: Reels
- 253 Videos vorhanden, ungesichtet
- Reels = Reichweite (Algorithmus bevorzugt Video)
- **Braucht:** Video-Sichtung, ffmpeg, Thumbnail, Caption

#### Nylongerie: Headlines & Captions verbessern
- Feed-Post Captions optimieren (mehr Engagement)

### P2 — Effizienz-Impact

#### Gewicht-Automatisierung
- Renpho → Apple Health → ??? → Felix
- Optionen: Apple Shortcut, Renpho API direkt

#### Community Skills evaluieren
- ClawHub durchschauen, npx skills add
- Memory Plugin (ClawVault/Supermemory) — niedrige Prio

#### Reddit im Evening Digest
- Relevante Subreddits beobachten

### P3 — Nice to Have

#### Kontakt-Tier-System
- 5 Tiers, Design existiert, Abhängigkeit: fromMe-Routing

#### Manheimer Berlin Automation
- Ähnlich Nylongerie, eigener Workflow, noch nicht spezifiziert

#### Email Auto-Triage
- Smart Replies, automatische Kategorisierung

#### Instagram Performance Tracking
- Insights API, Engagement-Metriken pro Post/Story

#### Product Tags (IG Shopping)
- Instagram Shopping Tags auf Posts

## 🏗️ ARCHITEKTUR

### Agents
| Agent | Model | Kosten/Msg | Zweck |
|-------|-------|-----------|-------|
| Felix (main) | google/gemini-2.5-flash | ~€0.001 | Persönlicher Agent, Orchestrator |
| Observer | anthropic/claude-haiku-4-5 | ~€0.001 | Stummer Logger |
| Nylongerie | google/gemini-2.5-flash | ~€0.001 | Instagram Content |

### Potenzielle zukünftige Agents
| Agent | Model | Trigger | Zweck |
|-------|-------|---------|-------|
| manheimer | google/gemini-2.5-flash | Cron | Manheimer Berlin Content |
| shopify | google/gemini-2.5-flash | Event | Order-Management, Alerts |
| research | google/gemini-2.5-flash | On-demand | Deep Research, Marktanalyse |

### Wann neuer Agent?
- ✅ Eigener Workflow mit eigenem State
- ✅ Regelmäßig wiederkehrend (Cron-tauglich)
- ✅ Würde Main Session Context aufblähen
- ❌ Einmalaufgaben → sessions_spawn
- ❌ Kurze Interaktionen → bleibt bei Felix

## Personal Assistant — Backlog (Priorität)

### P1 — Conil Woche 1
- [ ] Weekly Strategy Review aktivieren (Montag 10:00)
- [ ] Proaktive Eskalation: SPRING30-Typ Reminder
- [ ] Morning Briefing vollständig verifizieren

### P2 — Conil Woche 2
- [ ] Reddit OAuth + Evening Digest verifizieren
- [ ] Reise-Kontext: Gmail-Reservierungen lesen
- [ ] Meeting-Vorbereitung 30min vor Termin

### P3 — Später
- [ ] Withings → konkrete Tagesempfehlung
- [ ] LinkedIn Mentions im Briefing
- [ ] install.sh auf neuem Mac testen
