# Brevo ↔ Shopify Sync Strategy

## Current State (Working)

✅ Script exists: `scripts/brevo-shopify-reconcile.py`
✅ Syncs Shopify → Brevo (subscribed customers only)
✅ Removes unsubscribed/bounced contacts
✅ No additional apps needed

## Why Sync Is Needed

**Email signups flow:**
1. Visitor sees Shopify Forms popup on nylongerie.com
2. Enters email, gets 10% discount code
3. Email saved in **Shopify customer database**
4. **NOT automatically in Brevo**

**Purchase flow:**
1. Customer completes checkout
2. Accepts marketing consent
3. Added to **Shopify customer database**
4. **NOT automatically in Brevo**

**Result:** New subscribers accumulate in Shopify, Brevo list becomes stale without sync.

## Sync Frequency Options

### **Current: Manual Before Each Campaign**
- Pro: Full control, guaranteed fresh list
- Con: Easy to forget, manual work
- Risk: Campaign sent to stale list if you skip sync

### **Recommended: Weekly Automated**
- Cron job: Every Sunday 6:00 AM
- Keeps Brevo list fresh without manual work
- Catches new signups between campaigns
- Still allows manual sync before important campaigns

### **Overkill: Daily Automated**
- Only needed if >20 signups/day
- Current volume (~2-5/week) doesn't justify
- Would enable real-time welcome emails (not set up yet)

## Implementation (Weekly Cron)

```bash
# Add via OpenClaw cron
cron add brevo-weekly-sync \
  --schedule "0 6 * * 0" \
  --command "cd ~/.openclaw/workspace && python3 scripts/brevo-shopify-reconcile.py" \
  --delivery telegram \
  --topic 125
```

Runs every Sunday at 6 AM, sends results to Dev & Pipeline topic.

## Alternative: Native Brevo App?

Claude Chat mentioned a "native Brevo–Shopify app."

**Status: UNVERIFIED**
- Haven't confirmed this exists in Shopify App Store
- Could be another PushOwl situation (forgotten zombie app)
- Current script works fine

**Decision:** Don't add another app unless current script breaks.

## Monitoring

After setting up weekly cron, verify monthly:
- Brevo contact count matches Shopify subscribed count (±5 delta acceptable)
- Reconcile script runs successfully (check cron logs)
- No new unsubscribed contacts in Brevo list

## Notes

- Never sync FROM Brevo TO Shopify (reverse direction not needed)
- Shopify is source of truth for customer data
- Brevo is just a copy for campaign sending
- If Brevo list ever corrupts, delete it and re-import from Shopify
