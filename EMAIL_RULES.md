# EMAIL_RULES.md — Email Handling Rules
_Single source of truth for all email triage, routing, and response rules._
_Last updated: 2026-04-18_

---

## Accounts

All inboxes forward to Gmail. Felix monitors **one unified inbox**.

| Account | Provider | Purpose |
|---------|----------|---------|
| LotharEckstein@gmail.com | Gmail | Primary inbox (unified) |
| l.eckstein@botica.tech | Zoho | Botica business → forwarded |
| le@moba.berlin | United Domains | Moba → forwarded |
| l.e@me.com | Apple Mail | Personal → forwarded |

**Access:** `gog gmail search`, `gog gmail send`, `gog gmail read`, `gog gmail modify`

---

## Triage — 3 Categories

### 🟢 AUTO-HANDLE (No Approval Needed)

Mark as read immediately. No notification. No draft.

- **GitHub/development notifications** → mark read, archive
- **Shipping confirmations / order updates** → mark read, archive
- **Newsletters / promotional emails** → mark read, archive (or delete if promo)
- **Automated service emails** (banking alerts, system notifications) → mark read, archive
- **Emails to felix@botica.tech** → reply as "Felix, AI Assistant at Botica.tech" professionally

### 🟡 DRAFT + APPROVAL (Lothar Reviews)

Copy to Topic 66. Wait for explicit approval. Never send without it.

- **Personal emails** from contacts (Andreas Büchelhofer, friends, family)
- **Business inquiries** from new or unknown senders
- **Proposals, contracts, offers** — anything requiring a decision
- **Sensitive or emotional topics** (relationships, conflicts, health)
- **Anything you're unsure about** → default to this category

**Draft format (always to Topic 66):**
```
📧 *Von:* [Name] <[email]>
*Betreff:* [Subject]
*Kategorie:* [Personal / Business / Sonstiges]
*Zusammenfassung:* [1-2 sentences in German]

✏️ *Draft-Antwort:*
[Vorschlag]

👍 Senden | ✏️ Ändern | ❌ Ignorieren
```

### 🔴 VIP / IMMEDIATE (Escalate)

Flag immediately. Do not wait. Send to Topic 66 with URGENT tag.

- **Andreas Büchelhofer** — reply promptly, keep short
- **Peter Badge / ScienceNow matters** — urgent business
- **Legal or financial matters** — escalate immediately
- **Anything about Botica.tech contracts or clients** — escalate
- **Family emergencies** — escalate with phone call suggestion

---

## Response Rules

### Tone
- **Business:** Professional, concise, warm. Not corporate stiff.
- **Personal:** Warm, appropriate to relationship.
- **Language:** Match sender's language (German or English)

### Timing
- **Send emails:** Mon–Fri 09:00–18:00 CET only
- **No sending:** Late nights, weekends, public holidays
- **Exception:** Brevo newsletter campaigns (scheduled send via script)
- **If urgent:** Still respect timing — but flag as urgent for next business window

### Sender-Specific Rules

| Sender | Rule |
|--------|------|
| **Andreas Büchelhofer** | Priority. Keep responses short. Reply same day. |
| **Peter Badge** | Business only. ScienceNow matters are 🔴 VIP. |
| **Chanté-Whitney** | Personal. Warm tone. Never share details externally. |
| **Unknown senders** | Default to 🟡 DRAFT. Verify before auto-handling. |
| **Newsletter unrolls** | AUTO-HANDLE. Mark read + archive. |

### Blocked / Promo Filter
- Promotional emails with "unsubscribe" → AUTO-HANDLE (mark read + archive)
- Do NOT click unsubscribe links in scripts
- Generic promotional newsletters → archive silently

---

## Email Addresses for Sending

When composing replies or new emails, use the appropriate From address:

| Situation | From |
|-----------|------|
| General / Personal | LotharEckstein@gmail.com |
| Botica.tech business | l.eckstein@botica.tech (via Gmail Send As) |
| Nylongerie / Commercial | hello@nylongerie.com (via Brevo) |

**Configured Send As (Gmail):**
- LotharEckstein@gmail.com ✅
- l.eckstein@botica.tech ✅ (Zoho)
- lowtar@mac.com ✅ (old)

---

## Morning Briefing (Daily 07:30 CET)

The morning briefing includes an **email scan**:

```
gog gmail search 'is:unread newer_than:12h' --max 10
```

**In briefing output:**
- List unread emails with sender + subject
- Category per email: [ACTIONABLE] or [NEWSLETTER/PROMO]
- If 3+ actionable → highlight in briefing
- If 0 unread → report "0 unread"

**Format in briefing:**
```
📧 Emails (since yesterday)
→ [ACTIONABLE] Von: [Name] | Betreff: [Subject]
→ [PROMO] Von: [Brand] | Betreff: [Subject]
...
```

---

## Evening Digest (Daily 20:00 CET)

The evening digest includes a **lighter email check**:

```
gog gmail search 'is:unread newer_than:12h' --max 5
```

Same category labels. Shorter format.

---

## Felix Inbox Check Cron (8x/day: 08:00–20:00 CET)

**Cron ID:** `b280506f-a4af-499b-ac0d-108356ebcdb9`

This cron runs the full triage cycle. It reads this file (`EMAIL_RULES.md`) as its rules. If this file and the cron disagree, **this file wins** — update the cron to match.

**Workflow:**
1. `gog gmail search "is:unread newer_than:3h" --max 15`
2. Categorize each email → AUTO-HANDLE or DRAFT+APPROVAL
3. AUTO-HANDLE: mark read, archive
4. DRAFT+APPROVAL: send draft to Topic 66
5. If anything urgent → flag immediately

---

## Templates

### Auto-Reply (for felix@botica.tech inquiries)

```
Subject: Re: [Original Subject]

Hi [Name],

Vielen Dank für deine Nachricht. Ich bin Felix, Lothars AI Assistant bei Botica.tech.

Lothar erhält diese E-Mail und wird sich bei dir melden, sobald er die Chance hat.

Beste Grüße,
Felix
Botica.tech
```

### Standard Business Reply

```
Subject: Re: [Original Subject]

Hi [Name],

Danke für deine Nachricht. Ich leite das an Lothar weiter und melde mich zeitnah.

Beste Grüße,
[Lothar's name]
```

---

## Key Rules Summary

1. **Single source of truth = this file.** Read it before any email operation.
2. **Default to DRAFT+APPROVAL** when unsure.
3. **Never auto-send** business emails without approval.
4. **Mark read + archive** for all auto-handle categories.
5. **VIP senders get priority** — escalate, don't archive.
6. **No email sending outside 09:00–18:00 CET Mon–Fri** unless urgent.
7. **Brevo campaigns** are separate from personal email — never mix.

---

## When Rules Change

Update this file. Then update:
- The `felix-inbox-check` cron job payload (if triage rules change)
- OPERATIONS.md (if infrastructure changes)

Never update just the cron job and leave this file stale.
