# BACKLOG.md — Nylongerie & Felix
# Updated: April 6, 2026 — Conil de la Frontera

---

## ✅ COMPLETED (April 4-6, 2026)

- [x] Nylongerie production cron live (09:00 daily, 438 groups)
- [x] Felix → correct Brevo account (Nylongerie)
- [x] nylongerie.com + botica.tech authenticated in Brevo
- [x] hello@nylongerie.com sender verified (DKIM + DMARC green)
- [x] 6 Brevo automations: Welcome/SIGNUP15, Winback/10%, Browse, Purchase, Abandoned cart, VIP/20%
- [x] Shopify Messaging OFF — Brevo is single email system
- [x] Shopify Shipping update template — branded, Cainiao tracking
- [x] STRATEGY.md committed to Felix
- [x] Weekly Strategy Review cron (Monday 10:00)
- [x] Morning Briefing working (07:30)
- [x] All 5 Telegram topics routing correctly

---

## P1 — Conil Week 2

- [ ] A1: Goal Agent Architecture — GOALS.md, daily KPI to Digest, escalate if queue < 14
- [ ] E2: Instagram Performance Tracking — Graph API polling per post per account
- [ ] A3: Instagram DM Ingestion — 200 model DMs → candidate record → Telegram approval → pipeline

---

## P2 — Week 3

- [ ] B2: Headlines & Captions for Conversion (needs E2 data first)
- [ ] A2: KPI Tracking & Learning Loop (needs E2)
- [ ] B3: AI-Ready SEO — Classic Shopify first, GEO second
- [ ] A8: Reels Pipeline — highest reach format. 253 videos in inbox (843MB, all H.264 9:16, Instagram-native). Zero handle-mapped. **Step 1:** Lothar manual review for patterns. **Step 2:** Inventory script (ffprobe scan → reels-inventory.json). **Step 3:** Handle mapping (series-link or manual). **Step 4:** publish_reel tool (same container→poll→publish as POSTs, R2 upload, Topic 3 approval). Graph API part is trivial. Blocked on handle mapping. Prereq: POST+STORY stable for 1 week.
- [ ] A4: Content Pool Auto-Ingestion — R2 inbox → classify-v2 → merge
- [ ] B4: Model CRM — approved models → managed roster → follow-up cadence
- [ ] B1: Content Newsletter — nylons in movies, history, culture
- [ ] A5: Monthly Product Drop — Shopify + 7 accounts + Brevo
- [ ] D2: finance-agent — weekly P&L to Digest
- [ ] D5: weekly-strategy-review.sh script build

---

## P3 — Horizon

- [ ] A6: Performance-Based Account Weighting (needs 4+ weeks data)
- [ ] D3: Contact Tier System
- [ ] E3: X/Twitter Token regeneration
- [ ] E4: Reddit OAuth
- [ ] E5: NemoClaw Multi-Tenant (6-12 months)
- [ ] C1: Media & Licensing Pivot (when system proven)

---

## NEVER DO
- openclaw doctor --fix
- Overwrite series-map-final.json
- classify-results.json without --output flag
- Opus or gemini-2.5-pro
- openclaw config (destructive)
- sed on openclaw.json
- Trust Felix self-reported status without pgrep
- brew upgrade openclaw-cli without stopping gateway first
