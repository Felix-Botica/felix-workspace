# Deferred Drafts — Implementierungsplan

## Das Ziel
Niemand soll auf eine WhatsApp-Nachricht an Lothar länger als 24h warten müssen. Felix erkennt unbeantwortete Nachrichten, draftet eine Antwort, und sendet sie erst nach Lothars Freigabe.

## Das Kernproblem
Mit `dmPolicy: "allowlist"` (nur Lothar) werden Nachrichten von allen anderen **am Channel-Level geblockt**. Felix sieht sie nie. Es gibt keinen lokalen Nachrichten-Speicher den man scannen könnte — Baileys speichert nur Crypto-Keys, keine Message-History.

→ Wir MÜSSEN die Messages durchlassen, damit Felix sie sehen kann.

## Der Plan: Observer-Agent + Bindings

### Architektur

```
Nachricht von Kontakt X
        ↓
  [WhatsApp Channel — dmPolicy: "open"]
        ↓
  [Routing: Wer ist der Sender?]
        ↓
  Lothar (+491759959766) → Agent "main" (Felix, wie bisher)
  Alle anderen            → Agent "observer" (stummer Logger)
```

### Was der Observer-Agent tut
- Minimaler System-Prompt: "Log die Nachricht in eine Datei. Antworte IMMER mit NO_REPLY."
- Schreibt jede eingehende Nachricht in `workspace/wa-inbox/<nummer>.jsonl`
- Format: `{"timestamp": "...", "sender": "...", "body": "...", "messageId": "..."}`
- **Kein Outbound-Risiko** — der Observer hat keinen Zugriff auf `message` Tool
- Separater Workspace, keine Toolrechte

### Was Felix (main agent) tut
- Ein **Cron-Job** läuft alle 4 Stunden (10:00, 14:00, 18:00, 22:00)
- Liest `wa-inbox/*.jsonl`
- Prüft: Hat Lothar in den letzten 24h geantwortet? (via fromMe-Messages oder Tracker-Datei)
- Wenn nicht → Felix draftet eine Antwort in einer **isolierten Sub-Agent Session**
- Draft geht als WhatsApp an Lothar: "💬 *Draft für [Name]:* [Antwort] 👍/✏️/❌"
- Wenn nach 8h keine Reaktion → nochmal erinnern

### Config-Änderungen

```json5
{
  // Neuer Agent: Observer
  "agents": {
    "list": [
      {
        "id": "observer",
        "name": "Observer",
        "workspace": "~/.openclaw/workspace-observer",
        // Minimal-Prompt, kein Tool-Zugriff
      }
    ]
  },
  // Routing: Lothar → main, alle anderen → observer
  "bindings": [
    {
      "match": { "channel": "whatsapp", "peer": { "kind": "dm", "id": "+491759959766" } },
      "agentId": "main"
    }
    // Default agent → observer (für alle ohne explizites Binding)
  ],
  // DM Policy öffnen
  "channels": {
    "whatsapp": {
      "dmPolicy": "open",
      // allowFrom bleibt als Referenz, steuert aber nicht mehr das Blocking
    }
  }
}
```

## Sicherheits-Mechanismen

| Risiko | Mitigation |
|--------|------------|
| Observer antwortet versehentlich | Kein message-Tool, eigener Workspace ohne SOUL.md |
| Felix antwortet in fremdem Chat | Binding schickt Nicht-Lothar nie zu Felix |
| Observer-Prompt wird ignoriert | Tools.exec.security auf "deny" für Observer |
| Jemand spamt Felix voll | Rate-Limit auf Observer (lightweight model, z.B. Haiku) |

## Offene Fragen (brauche dein Input)

1. **Multi-Agent Config:** Ich muss prüfen ob OpenClaw `agents.list` + `bindings` + Default-Agent so unterstützt wie gedacht. Die Docs zeigen es, aber es könnte Edgecases geben.

2. **Observer Model:** Soll der Observer überhaupt ein LLM sein? Alternativ könnte ein **Hook** reichen — ein einfaches Script das bei jedem eingehenden Message feuert und in eine Datei loggt. Günstiger, kein API-Cost.

3. **"Hat Lothar geantwortet?" erkennen:** Wenn Lothar direkt auf WhatsApp antwortet (nicht über Felix), sieht Felix das nicht. Optionen:
   - a) `fromMe` Messages werden auch geloggt (Observer sieht Lothars ausgehende Messages)
   - b) Lothar sagt Felix manuell "hab X schon geantwortet"
   - c) Wir tracken es gar nicht und draftet immer — Lothar ignoriert einfach

4. **Dedizierte Nummer (langfristig):** Das eleganteste wäre eine zweite WhatsApp-Nummer für Felix. Eliminiert Impersonation komplett. Kostet ~5€/Monat für eine eSIM. Willst du das parallel evaluieren?

## Phasen

### Phase 1: Observer einrichten (heute)
- [ ] Multi-Agent Config testen
- [ ] Observer-Agent mit Minimal-Prompt erstellen
- [ ] Bindings konfigurieren
- [ ] Testen mit einer Testnachricht

### Phase 2: Cron-Scanner (diese Woche)
- [ ] Cron-Job der wa-inbox scannt
- [ ] Draft-Logik implementieren
- [ ] An Lothar senden mit Approval-Flow

### Phase 3: Approval-Handling (nächste Woche)
- [ ] Lothar antwortet 👍 → Felix sendet
- [ ] Lothar antwortet ✏️ [Text] → Felix sendet angepassten Text
- [ ] Lothar antwortet ❌ → Felix markiert als "bewusst nicht beantwortet"

### Phase 4: Dedizierte Nummer (optional)
- [ ] eSIM besorgen
- [ ] Zweites WhatsApp-Konto für Felix
- [ ] Migration auf eigene Identität

---
*Erstellt: 2026-03-08 | Status: Draft — wartet auf Lothars Feedback*
