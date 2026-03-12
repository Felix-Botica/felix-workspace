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

**Trend:** Starker Abwärtstrend hält! 90.85 → 87.35 in 6 Tagen. Durchschnitt letzte Woche: ~88.3 kg

## Devices
- **Withings ScanWatch** — Sleep, HR, SpO2, Activity, Body Temp
- **Withings Body+** — Waage (Storage)
- **Renpho Scale** — Aktuell genutzt, synct via Apple Health
- **Problem:** Renpho → Apple Health → Withings: Daten sichtbar in Withings App, aber API gibt nur Withings-eigene Geräte-Daten raus (kein Apple Health Import). Body+ im Lager in Berlin.
- **Lösung:** Gewicht wird manuell erfasst. Lothar gibt morgens den Wert durch, Felix trägt ein.

## API
- Withings API aktiv (User ID: 23049153)
- Token expires nach 3h — Auto-Refresh auf 401
- Siehe HEALTH_SKILL.md für API-Details
