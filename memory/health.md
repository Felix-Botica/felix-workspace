# Health — Lothar's Health Data & Concerns

## Primary Concern: Sleep
- Scores 29-37/100 — critically low
- Duration: nur 3.5-5h pro Nacht
- Efficiency: 95% (gut!) — es ist ein Dauer-Problem, kein Qualitäts-Problem
- **Lothar bevorzugt direkte, ehrliche Kommunikation** zu Gesundheitsthemen

## Vitals
- Resting HR: 55-58 avg (gut)
- Body temp (ScanWatch, Handgelenk): 33.3-33.8°C (normal)
- SpO2: via ScanWatch

## Weight
| Datum | Gewicht (kg) |
|-------|-------------|
| 2026-02-23 | 90.05 |
| 2026-02-24 | 89.25 |
| 2026-02-26 | 90.10 |
| 2026-02-27 | 90.40 |
| 2026-03-01 | 89.60 |
| 2026-03-02 | 90.85 |
| 2026-03-03 | 89.30 |
| 2026-03-04 | 88.65 |
| 2026-03-05 | 89.65 |
| 2026-03-06 | 88.18 |
| 2026-03-07 | 87.65 |
| 2026-03-08 | 87.35 |
| 2026-03-11 | 88.20 |
| 2026-03-12 | 87.90 |
| 2026-03-13 | 87.30 |
| 2026-03-14 | 86.75 |
| 2026-03-17 | 87.05 |
| 2026-03-18 | 86.60 |
| 2026-03-19 | 85.95 |

**Trend:** Abwärtstrend hält! Von ~90 kg Ende Februar auf 85.95 kg. Neuer Tiefstand! Nächstes Ziel: 85 kg — fast da.

## Devices
- **Withings ScanWatch** — Sleep, HR, SpO2, Activity, Body Temp
- **Withings Body+** — Waage (im Lager Berlin, ungenutzt)
- **Renpho Scale** — Aktuell genutzt, synct via Apple Health

## Weight-Pipeline (Stand 2026-05-31 — ✅ LIVE: Apple Health direkt via iOS-Kurzbefehl, Withings ausgeschnitten)
**Neue Kette:** **Renpho Waage → Renpho-App → Apple Health → iOS-Kurzbefehl liest letztes Body-Mass-Sample → push via SSH auf den Mac → `workspace/data/applehealth-weight.json` → `workspace/scripts/withings-weight.py` (liest jetzt diese Datei) → Morning Briefing.**
- **Warum:** Die alte Kette (…→ Withings-Cloud) ist tot — Withings importiert Fremd-Gewicht NICHT aus Apple Health (Screenshots 2026-05-31 beweisen: Renpho→Apple Health funktioniert ✓, aber Withings-Cloud hängt 51 Tage bei 85,0/10.04). „Withings darf schreiben"-Toggles sind die FALSCHE Richtung (App→Health); ein Import-Toggle existiert für Gewicht faktisch nicht.
- **Mac-Seite gebaut & getestet 2026-05-31:**
  - `workspace/scripts/applehealth-weight-write.py` — Writer, vom Kurzbefehl per SSH aufgerufen: `applehealth-weight-write.py "<gewicht>" "[<iso-datum>]"`. Normalisiert „85,9 kg"/„85,9"/„85.9", validiert 30–300 kg, schreibt `applehealth-weight.json` (latest) + `applehealth-weight-history.json` (dedupe pro Tag, für Trend-Pfeil). Datum optional (default heute).
  - `workspace/scripts/withings-weight.py` — Reader (Name beibehalten, damit `cron-runner.sh:236` unverändert bleibt). Liest ZUERST die Apple-Health-Datei; nur wenn sie fehlt/unlesbar ist → Fallback auf Withings-Cloud. Output-Format identisch (Briefing unverändert). History vorbefüllt mit echten Werten 19.–31. Mai.
  - Verifiziert: AH-Pfad → `⚖️ Gewicht: 85.9 kg (Stand 31.05.) ▲ +1.1 kg vs. 29.05.`; Fallback (Datei versteckt) → Withings 85,0/10.04. Beide Pfade ok, py_compile sauber.
- **✅ LIVE — iOS-Kurzbefehl (gebaut & verifiziert 2026-05-31 15:49):** Ganze Kette läuft end-to-end. Push vom Handy (85.9 kg) landete in `applehealth-weight.json`, Briefing rendert `⚖️ Gewicht: 85.9 kg (Stand 31.05.) ▲ +1.1 kg vs. 29.05.`.
  - **Kurzbefehl-Aufbau:** „Health-Messungen suchen" (Körpergewicht, neueste, Limit 1) → „Detail aus Health-Messungen abrufen" = **Wert** → „Skript über SSH ausführen".
  - **Funktionierende SSH-Config:** Host `192.168.1.96`, Port `22`, **Benutzer `lothareckstein`** (NICHT Root!), Auth **Passwort** (= Mac-Login-Passwort), **Skript: `/Users/lothareckstein/wlog ‹Wert›`** (Wert-Variable als ARGUMENT, genau EINE Leerstelle davor), Eingabe = **Keine**.
  - **`/Users/lothareckstein/wlog`** = kurzer Shell-Wrapper (chmod +x), reicht `"$@"` an `applehealth-weight-write.py` weiter. Eingeführt, weil der lange Pfad am Handy zu fehleranfällig war.
  - **Fallstricke (gelöst — falls je neu zu bauen):** (1) Benutzer stand auf **Root** → macOS lehnt Root-Passwort-SSH ab (`PermitRootLogin prohibit-password`) → „kann nicht verbinden". Fix: `lothareckstein`. (2) **Eingabe/stdin** wird vom SSH-Action NICHT als stdin übergeben → Wert MUSS Argument sein, nicht Eingabe. (3) **Stray space im Pfad** (`/Users/lothareckstein/ .openclaw`) → python startet das Verzeichnis statt das Skript → exit 2, KEIN Write, KEIN Fehlerdialog (tückisch!). Darum der kurze Wrapper-Pfad. (4) **Remote Login** (System Settings → General → Sharing) muss AN sein (war es). (5) Diagnose: `lsof` für Port 22 ist im Agent-Sandbox blind → mit `nc -z 192.168.1.96 22` testen, das zeigt die Wahrheit.
  - **Automation (empfohlen, optional):** Kurzbefehl täglich ~08:00 automatisch ausführen wenn Handy zuhause im WiFi. Solange ungebaut: einmal pro Morgen manuell antippen.
- **DEFEKT EINGEGRENZT (2026-05-31, via Screenshots):** Withings-Cloud hängt bei **85,0 kg / Stand 10.04. (51 Tage alt)**. Die Bruchstelle ist jetzt eindeutig die **LETZTE Etappe: Apple Health → Withings-Cloud**. Withings importiert das Gewicht NICHT aus Apple Health.
  - **Renpho → Apple Health ist BEWIESEN intakt ✓✓:** Screenshot „Daten von RENPHO Health → Alle Dateneinträge (kg)" zeigt eine lückenlose tägliche Serie inkl. **heute 85,9 kg @ 31. Mai 06:40, Quelle RENPHO**. Die korrekten, aktuellen Daten liegen also bereits in Apple Health.
  - **Disambiguierung aufgelöst:** „Steht heute 85,9 mit Quelle RENPHO in Apple Health?" → **JA.** ⇒ Bruch liegt beim Withings-Import, NICHT bei Renpho.
  - **„Starten Sie die Synchronisierung" (Renpho)** kehrt zum selben Screen zurück = normal, kein Fehler — Renpho hat ja bereits erfolgreich nach Apple Health geschrieben (06:40-Wert ist da). Diese Aktion ist für das Problem irrelevant.
  - **Wurzel:** Withings Health Mate zieht Fremd-Gewicht (Renpho) nicht aus Apple Health in die Withings-Cloud. Die Withings↔Apple-Health-Integration ist für Gewicht faktisch EINWEG (Withings schreibt eigene Messungen NACH Apple Health, liest aber kein fremdes Gewicht zurück). Diese Etappe funktionierte vermutlich nie zuverlässig; die 85,0/10.04 war wohl die letzte echte Withings-eigene Messung.
  - **EMPFOHLENER FIX — Withings ausschneiden, direkt aus Apple Health lesen:** Da Apple Health bereits den korrekten Tageswert hat, ist die robuste Lösung ein **iOS-Kurzbefehl**, der das letzte Body-Mass-Sample liest und in eine vom Mac lesbare Datei schreibt (z. B. JSON in iCloud Drive: `~/Library/Mobile Documents/.../weight.json`). Briefing liest diese Datei statt der Withings-Cloud. Beseitigt die fragile 2-Hop-Kette komplett. **Status: vorgeschlagen, noch nicht gebaut** (Lothar baut den Kurzbefehl; Reader-Script wird dann ergänzt).
  - **Optionaler Withings-Check (niedrige Erfolgsaussicht):** Withings Health Mate → Profil → Geräte/Einstellungen → Apple Health — prüfen ob es überhaupt eine „Gewicht importieren"-Option gibt. Wenn nicht vorhanden → bestätigt, dass nur der Kurzbefehl-Weg funktioniert.

## API
- Withings API aktiv (User ID: 23049153)
- Token expires nach 3h — Auto-Refresh auf 401
- Siehe HEALTH_SKILL.md für API-Details
