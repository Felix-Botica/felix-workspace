# ✅ INSTAGRAM OPERATIONS — ACTIVE

**Freeze lifted:** 2026-04-06 by Lothar
**Original freeze:** 2026-03-29 (memory loss incident)

---

## Current Status

### ✅ Posts — ACTIVE (seit 2026-04-04)
- Daily batch cron: `0 9 * * *` via `nylongerie-daily.sh`
- 7 accounts, v2 classifier (466 groups), approval via Telegram Topic 3
- `nylongerie-publish.js` fixed (aspect ratio, @-prefix, field mapping)

### ✅ Stories — ACTIVE (seit 2026-04-06)
- Daily story cron: `0 10 * * *` via `promo-story.js`
- Felix generiert Story-Bild + Discount-Code + sendet an Topic 3
- **Lothar postet manuell** (IG API kann keine Link-Sticker)

### 🔴 API Story-Publish — DEAKTIVIERT
- `story-publish.js`: Default ist `--dry-run`, Live nur mit `--live` Flag
- Grund: Instagram Graph API unterstützt keine Link-Sticker
- Stories ohne Link-Sticker sind wertlos (kein Traffic → kein Umsatz)

---

## Safety Gates (bleiben aktiv)
- Freigabe-Gate: Nur `status: "approved"` darf publiziert werden
- Banned images: `banned-images.json` wird geprüft
- Lothar-Approval: Jeder Post/Story muss via Telegram bestätigt werden
- Story API-Publish: Physisch blockiert durch `--live` Flag Requirement

### 🔒 LEGAL: Bildquellen-Regel (seit 2026-04-04)
- **Posts** (`nylongerie-daily.sh`): `inbox/` Bilder → organic content ✅
- **Promo Stories** (`promo-story.js`): **NUR Shopify-Produktbilder** ✅
- Grund: Model-Fotos haben Collaboration-Rechte, aber KEINE Commercial/Sales-Rechte
- Promo Stories mit Discount/Sale-Inhalt + Model-Foto = Rechtsverstoß
- Enforcement: CDN-Check (`cdn.shopify.com`), kein Fallback auf lokale Dateien
- Bei fehlendem Produktbild: Story wird übersprungen + Warnung an Topic 125

---

## Was zum Freeze führte (für Kontext)
Felix verlor am 29.03. operatives Wissen und schlug gebannte Bilder vor.
**Gelöst durch:**
- v2 Classifier (466 Gruppen, >95% akkurat)
- Strukturierte MEMORY.md files pro Agent
- Fixes in publish.js, create-batch.js, cron-Konfiguration
- Externe Health-Checks und Gateway-Restart Scripts

---

Last updated: 2026-04-06 by Lothar
