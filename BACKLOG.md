# BACKLOG.md — Felix Produktionsstraße

_Was läuft, was kommt, was wartet. Priorisiert nach Impact._

## 🟢 LIVE (funktioniert)

### Morning Briefing (07:30 CET)
- Email-Scan (actionable vs noise)
- Kalender (Konflikte, Geburtstage)
- Gewicht (manuell — Lothar gibt Wert durch)
- **Next Steps:**
  - [ ] Gewicht automatisieren — Renpho API direkt? Apple Health Export? Shortcut der morgens den Wert an Felix schickt?
  - [ ] Wetter am aktuellen Standort einbauen
  - [ ] LinkedIn-Mentions/Nachrichten (wenn API verfügbar)
  - [ ] Botica-Inbox (Zoho) — sobald "Send as" Alias in Gmail steht

### WA Inbox Digest (21:00 CET)
- Alle eingehenden WhatsApp-Nachrichten der letzten 24h
- Kontakt-Auflösung via people.md
- Lothar entscheidet welche Chats Draft brauchen
- **Limitation:** Lothars eigene Antworten nicht sichtbar (fromMe-Routing fehlt in OpenClaw)

### Wind-Down Reminder (23:00 CET)
- Schlaf-Nudge per WhatsApp

### X Evening Digest (20:00 CET)
- Twitter/X Mentions und relevante Tweets

### Observer Agent (Haiku 4.5)
- Stummer Logger für alle Nicht-Lothar WhatsApp/Telegram DMs
- Kein Leak, keine Tools, nur NO_REPLY

## 🟡 IN ARBEIT

### Nylongerie Sub-Agent (Sonnet 4)
- Agent registriert, Workspace aufgesetzt
- Cron: 10:00 täglicher Batch
- **Status:** Grundstruktur steht, erster echter Lauf noch ausstehend
- **Scope aktuell:** Posts (Foto-Klassifizierung → Caption → Draft → Approve → Publish)

## 🔴 BACKLOG (priorisiert nach Impact)

### P1 — Umsatz-Impact

#### Nylongerie: Stories
- Stories sind DER Umsatztreiber (direkte Produkt-Links, Swipe-Up)
- Workflow: Produkt auswählen → Story-Template → Link → Publish
- Instagram Graph API unterstützt Stories (image + video)
- **Braucht:** Produkt-Katalog-Anbindung (Shopify API), Story-Templates, Frequenz 2-3/Tag/Account
- **Abhängigkeit:** Shopify API Integration

#### Nylongerie: Email-Kampagnen
- 700 Kunden, 3% Conversion (10x Social!)
- Shopify Email — Top-Performer der Woche, saisonale Kampagnen
- **Braucht:** Shopify API, Performance-Tracking, Template-System

#### Nylongerie: Reels
- Reels = Reichweite (Algorithmus bevorzugt Video)
- 253 Reels bereits klassifiziert im Content-Pool
- Instagram Graph API unterstützt Reels (video_url + media_type=REELS)
- **Braucht:** Video-Verarbeitung (ffmpeg), Thumbnail-Generierung, Caption-Anpassung für Video

### P2 — Effizienz-Impact

#### Gewicht-Automatisierung
- Aktuell: Lothar gibt Wert manuell durch
- Renpho-Waage → Apple Health → ??? → Felix
- **Optionen:**
  - Apple Health Shortcut der morgens automatisch den letzten Wert an Felix schickt
  - Renpho API direkt (falls vorhanden)
  - Manuelle Eingabe bleibt Fallback
- **Aufwand:** Gering (Shortcut) bis Mittel (API)

#### Email "Send as" Aliases
- l.eckstein@botica.tech (Zoho SMTP) in Gmail
- lowtar@mac.com (iCloud SMTP) in Gmail
- Felix kann dann als richtige Absenderadresse antworten
- **Status:** Pending — SMTP-Credentials nötig

#### fromMe-Routing (OpenClaw Feature Request)
- Observer sieht nur eingehende Nachrichten
- fromMe-Routing würde echte "unbeantwortet"-Erkennung ermöglichen
- **Status:** Feature Request vorbereitet, noch nicht eingereicht
- GitHub: openclaw/openclaw

### P3 — Nice to Have

#### Reddit-Monitoring
- Relevante Subreddits beobachten (welche? Mit Lothar klären)
- Potenzial: Nylongerie-Community, AI/Agent-Szene, Business-Trends
- **Braucht:** Reddit API oder Web-Scraping, Cron-Job, Digest-Format

#### Kontakt-Tier-System
- 5 Tiers (Family → Business) für automatisierte Antwort-Priorisierung
- Design existiert, Implementation ausstehend
- **Abhängigkeit:** fromMe-Routing für volle Funktionalität

#### Manheimer Berlin Automation
- Ähnlich wie Nylongerie, aber eigener Workflow
- **Status:** Noch nicht spezifiziert

## 🏗️ ARCHITEKTUR-FRAGEN

### Sub-Agent-Strategie: Wie systematisch skalieren?

**Aktueller Stand (3 Agents):**
| Agent | Model | Kosten/Msg | Zweck |
|-------|-------|-----------|-------|
| Felix (main) | Opus 4.6 | ~€0.05 | Persönlicher Agent, Orchestrator |
| Observer | Haiku 4.5 | ~€0.001 | Stummer WhatsApp/Telegram Logger |
| Nylongerie | Sonnet 4 | ~€0.01 | Instagram Content |

**Prinzipien für neue Agents:**
1. **Isolierung:** Eigener Workspace, eigene Sessions, kein Context-Bleed
2. **Right-sized Model:** Haiku für Logging, Sonnet für Content, Opus nur für komplexe Entscheidungen
3. **Cron-getrieben:** Agents werden geweckt, arbeiten Batch ab, schlafen ein
4. **Draft-First:** Kein Agent sendet autonom — immer Draft → Lothar → Approve
5. **Felix als Orchestrator:** Main Agent steuert Sub-Agents bei Bedarf an

**Potenzielle zukünftige Agents:**
| Agent | Model | Trigger | Zweck |
|-------|-------|---------|-------|
| manheimer | Sonnet 4 | Cron | Manheimer Berlin Content |
| shopify | Sonnet 4 | Cron/Event | Order-Management, Produkt-Updates |
| research | Opus 4.6 | On-demand | Deep Research, Marktanalyse |
| bookkeeper | Sonnet 4 | Cron weekly | Finanzen, Rechnungen, Ausgaben |

**Wann lohnt sich ein neuer Agent?**
- ✅ Eigener Workflow mit eigenem State (Files, Queue, Pipeline)
- ✅ Regelmäßig wiederkehrend (Cron-tauglich)
- ✅ Würde Main Session Context aufblähen
- ❌ Einmalaufgaben (→ sessions_spawn als Sub-Agent)
- ❌ Kurze Interaktionen ohne eigenen State (→ bleibt bei Felix)
