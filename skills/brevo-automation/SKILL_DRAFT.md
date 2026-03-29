# Felix Skill: Shopify → Brevo Email Campaign Automation

**Status:** DRAFT — Not yet implemented
**Created:** 2026-03-29 05:30
**Source:** Claude Chat output
**Warning:** Requires testing before production use

---

## Overview

This skill gives Felix full control over Brevo email campaigns via API,
triggered by Shopify events or manual WhatsApp commands from Lothar.

No GUI needed. Everything runs from shell on the Felix MacBook Air M1.

---

## Architecture

```
Lothar (WhatsApp/Telegram)
 │
 ▼
 Felix / OpenClaw
 │
 ┌────┴────────────────┐
 │                     │
Shopify Admin API   Brevo API
(pull customer data) (send campaigns)
 │                     │
 └────────┬────────────┘
          │
   ~/.felix/brevo/
   (local state, logs, templates)
```

---

[DOCUMENT CONTINUES WITH FULL IMPLEMENTATION DETAILS AS PROVIDED]

---

## TODO Before Implementation

- [ ] Test Shopify API access with current token
- [ ] Test Brevo API with simple list query
- [ ] Verify Python inline scripts work
- [ ] Add verification protocol (15-min status check after send)
- [ ] Add rate limiting to sync function
- [ ] Test template system
- [ ] Create default templates (new_arrivals, flash_sale)
- [ ] Set up logging rotation
- [ ] Document recovery procedures
- [ ] Add pre-flight checks from lessons.json

## Known Risks

1. **No verification after send** — could repeat silent-fail problem
2. **Rate limiting** — sync function hits API in tight loop
3. **Quote escaping** — Python inline scripts might break
4. **Complexity** — adds another layer to already complex system
5. **PushOwl dependency** — unclear how this integrates with PushOwl

## Decision Point

Before implementing:
1. Is PushOwl blocking this approach?
2. Does Brevo API work reliably?
3. Do we actually need automation or is manual faster?
4. Have we validated the time ROI (3+ hours setup vs 15 min manual)?

---

**Recommendation:** Test manually first, automate only if painful.
