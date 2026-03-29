# CRON_RULES.md — Cron Job Best Practices

## Mandatory Fields for All Crons

Every cron job MUST have:

```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "...",
    "lightContext": true,        // ✅ REQUIRED for delivery to work
    "timeoutSeconds": 120,       // Recommended: 120-300 depending on task
    "model": "anthropic/claude-sonnet-4-5"  // Optional, uses default if omitted
  },
  "delivery": {
    "mode": "announce",
    "channel": "telegram",
    "to": "telegram:-1003775282698:<topic_id>"  // Full chat + topic ID
  },
  "sessionTarget": "isolated",   // Standard for crons
  "wakeMode": "now"              // Standard for crons
}
```

## Why `lightContext: true` is Required

Without `lightContext: true`, isolated cron sessions cannot access outbound channel configuration, causing:
```
Error: Outbound not configured for channel: telegram
```

This was the root cause of the March 27-29, 2026 cron failures.

## Topic ID Reference

| Topic Name           | Topic ID | Purpose                              |
|----------------------|----------|--------------------------------------|
| General              | 1        | Ad-hoc conversations                 |
| NylonGerie           | 3        | Nylongerie content & approvals       |
| Digest               | 4        | All briefings & digests              |
| 📬 Inbox & Drafts    | 66       | Email drafts & WhatsApp inbox        |
| 🛠 Dev & Pipeline    | 125      | System health, backups, tech alerts  |

## Testing Protocol

### Safe to Test Anytime
- Digest crons (morning-briefing, evening-digest, wa-inbox-digest)
- Health checks (integration-healthcheck)
- Reports (weekly-system-review)
- Reminders (wind-down)

### Require Approval Before Testing
- Content generation (nylongerie-daily-batch)
- Email campaigns (weekly-newsletter)
- External writes (nightly-github-backup, brevo-shopify-sync)

### How to Test
```bash
# Run manually (asynchronous)
openclaw cron run <job-id>

# Check result after 30-60s
openclaw cron runs <job-id> --json | jq '.entries[0] | {status, deliveryStatus, error}'
```

## When Creating New Crons

1. **Copy a working cron** as template (e.g., evening-digest)
2. **Verify all required fields** are present
3. **Test manually** before enabling scheduled runs
4. **Document** in this file and in MEMORY.md

## Common Mistakes to Avoid

❌ Omitting `lightContext: true`
❌ Using incomplete delivery targets (missing topic ID)
❌ Not specifying timeoutSeconds for long-running tasks
❌ Testing write-heavy crons without approval
❌ Updating instructions without testing

## Validation Checklist

Before deploying any cron:
- [ ] `lightContext: true` is set
- [ ] Delivery target exists and is correct
- [ ] Instructions are current and accurate
- [ ] Timeout is appropriate for task complexity
- [ ] Model is specified if non-default behavior needed
- [ ] Tested manually at least once

## Troubleshooting

**Symptom:** "Outbound not configured for channel: telegram"
**Fix:** Add `"lightContext": true` to `payload`

**Symptom:** Cron runs but doesn't deliver
**Fix:** Check delivery target format: `telegram:-1003775282698:<topic_id>`

**Symptom:** Cron times out
**Fix:** Increase `timeoutSeconds` in payload (default 120, max 300 for complex tasks)

**Symptom:** Cron uses wrong model or old instructions
**Fix:** Update via `openclaw cron update <job-id> --patch '{...}'` or use cron tool

## Automated Token Refresh

**Withings:** Tokens expire after 3h, refresh token lasts 6 months. Auto-refresh every 2 hours via cron.
**Twitter:** OAuth 1.0a tokens don't expire but can be revoked. Verified every 2 hours.

Script: `/Users/lothareckstein/.openclaw/workspace/scripts/token-refresh.sh`
Cron: `token-refresh` runs every 2 hours, alerts to Topic 125 (Dev & Pipeline) if refresh fails.

## History

- **2026-03-27:** First failures detected (lightContext missing on some crons)
- **2026-03-29:** Root cause identified, all crons updated with lightContext: true
- **2026-03-29:** Added automated token-refresh cron (every 2h) for Withings & Twitter
