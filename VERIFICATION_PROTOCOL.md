# VERIFICATION PROTOCOL

## Mandatory Verification Actions

Before reporting ANY of these as "done" or "successful," you MUST verify via live API/system query:

### Email Campaigns
- **Claim:** "Campaign sent successfully"
- **Verify:** `curl -H "api-key: $BREVO_API_KEY" https://api.brevo.com/v3/emailCampaigns/{id}` 
- **Required fields:** `status='sent'` AND `statistics.globalStats.sent > 0`
- **Timeline:** Within 15 minutes of send attempt

### Instagram Posts
- **Claim:** "Post published to @account"
- **Verify:** Query Graph API for post ID, check `is_published=true`
- **Required:** Permalink visible

### Shopify Orders/Discounts
- **Claim:** "Discount code SPRING30 active"
- **Verify:** Query Shopify API `/admin/api/2024-01/price_rules.json`
- **Required:** `starts_at <= now`, `ends_at > now`, `usage_count < usage_limit`

### File Operations
- **Claim:** "Saved to file X"
- **Verify:** `ls -lh /path/to/file` or `cat /path/to/file | head`
- **Required:** File exists, size > 0

---

## Response Template

When verification is required, ALWAYS structure response as:

```
ACTION ATTEMPTED: [what you tried to do]

VERIFICATION QUERY:
[exact command/API call you ran]

RAW RESPONSE:
[paste actual response, unedited]

INTERPRETATION:
[what this means - success/failure/unknown]

NEXT ACTION:
[what to do based on result]
```

---

## Red Flags (Self-Check)

Before claiming something worked, ask yourself:

1. Did I see the ACTUAL system response, or am I inferring from a tool return value?
2. Can I show Lothar the raw API/system output proving this claim?
3. If this failed silently, would I know within 15 minutes?
4. **NEW:** If this is a status/configuration check (auth, domain, plan limits), did I verify in BOTH API and UI?

If ANY answer is "no" → run verification query first.

---

## When API and UI Might Conflict

For authentication, configuration, and status checks, **APIs can return stale/cached data** while UIs show current state.

### High-Risk Areas for API/UI Mismatch:
- Domain verification status (Brevo, Shopify, DNS providers)
- Authentication/authorization state
- Plan limits and quotas
- Payment/billing status
- Feature availability (free vs paid)

### Mandatory Cross-Check Process:

**BEFORE reporting status as verified/enabled/active:**

1. ✅ Query API endpoint
2. ✅ **Ask Lothar for UI screenshot** of the same status
3. ✅ Compare API response vs UI display
4. ❌ **If they conflict → TRUST THE UI**
5. ✅ Document the discrepancy
6. ✅ Flag API endpoint as unreliable for future

**Example (Brevo domain verification):**

```
API Response: {"verified": true, "authenticated": true}
UI Display: "Not authenticated" with "Authenticate" button
→ TRUST UI, domain is NOT verified
→ Report: "API says verified but UI shows not authenticated. Domain requires setup."
```

### Why This Matters:

**Lesson from 2026-03-29:**
- API endpoint `/v3/senders/domains/nylongerie.com` returned `verified: true`
- Brevo UI showed "Not authenticated" 
- Result: Falsely reported domain as verified
- Impact: Wasted time, incorrect troubleshooting path

**The Rule:** For critical status checks, screenshots > API responses.

---

## When to Skip Verification

Verification overhead is acceptable for:
- External API writes (email, social, payments)
- Multi-step async operations
- Anything that affects customers/revenue

Verification NOT needed for:
- File reads
- Search queries
- Internal workspace operations
- Exploratory research
