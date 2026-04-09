# 🔐 Token Dashboard
**Last Updated:** 2026-04-08T14:00Z

> **Golden Rule:** Token failures are PREVENTED, not managed. This dashboard shows the prevention system in action.

---

## 📊 Current Token Health

| Service | Status | Expiry | Auto-Refresh | Alert Threshold |
|---------|--------|--------|--------------|-----------------|
| **Withings** | ✅ Valid | ∞ (2 years) | ✅ Daily 08:00 | 14 days |
| **Instagram** | ✅ Valid | 60 days | ✅ API-based | 7 days |
| **Google OAuth** | ✅ Valid | ∞ (auto) | ✅ gog CLI | 30 days |
| **WhatsApp** | ✅ Active | 14 days | ❌ Manual | 2 days |
| **Shopify** | ✅ Permanent | ∞ | ❌ N/A | ∞ |
| **Brevo** | ✅ Permanent | ∞ | ❌ N/A | ∞ |
| **X/Twitter** | ✅ Permanent | ∞ | ❌ N/A | ∞ |
| **MiniMax** | ✅ Valid | Balance-based | ❌ N/A | Alert on low balance |

---

## 🔄 Automation Schedule

### Daily Refreshes (08:00 CET)
```
08:00 → token-refresh-extended.sh runs
├─ Withings: Refresh token via OAuth
├─ Instagram: Check & refresh if < 7 days to expiry
├─ Google: Verify OAuth (gog handles it)
└─ WhatsApp: Check session status, alert if < 2 days
```

**Cron Job:** `Daily Token Refresh` (d1bd9774-a553-4134-9b0a-0e5023a3df0c)

### Daily Health Checks (09:00 CET)
```
09:00 → health-check-safe.sh runs
├─ All token endpoints tested
├─ .env file integrity verified
├─ Gateway status confirmed
└─ Alerts sent to Telegram Topic 125 if issues
```

**Cron Job:** TBD (can add if needed)

### Weekly Audit (Sunday 19:00 CET)
```
Sunday 19:00 → token-audit-report.sh runs
├─ Generates comprehensive status report
├─ Highlights expiries & alerts
├─ Stores in memory/token-audit-YYYY-Www.md
└─ Summary sent to Telegram Topic 125
```

**Cron Job:** TBD (needs to be created)

---

## 🚨 Alert Rules

### Immediate Alerts (< 2 days)
- **WhatsApp expires in < 2 days**
  - Message: "⚠️ WhatsApp session expires in X days. Run: `openclaw channels login whatsapp`"
  - Channel: Telegram Topic 125
  - Action: Manual QR scan required

### Warning Alerts (< 7 days)
- **Instagram expires in < 7 days**
  - Message: "⚠️ Instagram token expires in X days. Auto-refresh will attempt."
  - Channel: Telegram Topic 125
  - Action: Monitor (auto-refresh will handle it)

### Info Alerts (< 14 days)
- **Withings or other service expiring soon**
  - Message: Service name + days remaining
  - Action: Monitor (auto-refresh active)

---

## 📁 Files & Locations

| File | Purpose | Updated |
|------|---------|---------|
| `~/.openclaw/.env` | Token storage | Daily via cron |
| `memory/tokens.json` | Token metadata & status | Daily + weekly audit |
| `memory/token-audit-*.md` | Weekly audit reports | Every Sunday 19:00 |
| `scripts/token-refresh-extended.sh` | Auto-refresh executor | N/A (executable) |
| `scripts/health-check-safe.sh` | Health verification | N/A (read-only) |
| `scripts/token-audit-report.sh` | Report generator | N/A (executable) |
| `HEARTBEAT.md` | Periodic tasks config | Includes token checks |
| `CRITICAL_OPS.md` | Safe operation procedures | Reference guide |

---

## 🛠 Manual Operations

### WhatsApp Token Refresh (When Alerted)
```bash
openclaw channels login whatsapp
# Scan QR code → 14-day session reset
# Verify in openclaw.json (looks for whatsapp.net)
```

### Instagram Token Manual Refresh (Fallback)
```bash
# If auto-refresh fails, get new token from Meta Dashboard
# Then update:
sed -i '' 's/META_ACCESS_TOKEN=.*/META_ACCESS_TOKEN=<new_token>/' ~/.openclaw/.env
openclaw gateway restart

# Verify:
curl -s "https://graph.instagram.com/me?access_token=$(grep META_ACCESS_TOKEN ~/.openclaw/.env | cut -d= -f2)" | jq
```

### Google OAuth Refresh (If Broken)
```bash
gog auth refresh
# Or full re-auth:
rm ~/Library/Application\ Support/gogcli/credentials.json
gog auth init
```

### Withings Token Manual Refresh (Fallback)
```bash
~/.openclaw/workspace/scripts/token-refresh.sh  # Original script
# Or via extended script:
~/.openclaw/workspace/scripts/token-refresh-extended.sh --force-all
```

---

## 📈 Token Lifecycle

### Withings (OAuth Refresh Token)
```
Initial Auth (browser) 
  → Refresh Token (2-3 years validity)
  → Daily refresh via cron (keeps access token fresh)
  → ∞ uptime guaranteed
```

### Instagram (Meta Long-Lived Token)
```
Initial Auth (Meta Dashboard)
  → Long-lived token (60 days max)
  → Auto-refresh at day 55 (if < 7 days)
  → New 60-day token issued
  → ∞ uptime with monitoring
```

### Google (OAuth + gog)
```
Initial Auth (browser + gog)
  → OAuth Refresh Token
  → gog auto-refreshes on first use each session
  → No manual intervention needed
  → ∞ uptime guaranteed
```

### WhatsApp (Session Token)
```
Initial Auth (QR scan)
  → 14-day session token
  → Alert at day 12
  → Manual re-scan required
  → New 14-day session
```

---

## ❌ What We're Protecting Against

| Failure | Without System | With System |
|---------|----------------|------------|
| WhatsApp expires silently | ❌ No outgoing messages | ✅ Alert 2 days before |
| Instagram token invalid | ❌ Silent posting failures | ✅ Alert + auto-refresh |
| Withings token stale | ❌ Sleep data stops | ✅ Auto-refreshed daily |
| Google OAuth broken | ❌ Email/Calendar down | ✅ Auto-refresh on use |

---

## 🔍 Monitoring Commands

### Check token status right now
```bash
~/.openclaw/workspace/scripts/health-check-safe.sh
```

### Read token metadata
```bash
cat memory/tokens.json | jq .tokens
```

### View latest audit report
```bash
ls -lrt memory/token-audit-*.md | tail -1 | awk '{print $NF}' | xargs cat
```

### Watch token refresh log
```bash
tail -f ~/.openclaw/logs/token-refresh.log
```

### Test individual token
```bash
# Withings
curl -s "https://wbsapi.withings.net/v2/sleep?action=getsummary&startdateymd=TODAY&enddateymd=TODAY" \
  -H "Authorization: Bearer $(grep WITHINGS_ACCESS_TOKEN ~/.openclaw/.env | cut -d= -f2)" | jq .status

# Instagram
curl -s "https://graph.instagram.com/me?access_token=$(grep META_ACCESS_TOKEN ~/.openclaw/.env | cut -d= -f2)" | jq .id

# Shopify
curl -s "https://ecb34e-4.myshopify.com/admin/api/2024-01/shop.json" \
  -H "X-Shopify-Access-Token: $(grep SHOPIFY_ACCESS_TOKEN ~/.openclaw/.env | cut -d= -f2)" | jq .shop.name
```

---

## 📞 Support

**If a token suddenly breaks:**
1. Check `health-check-safe.sh` output
2. Look up "Manual Operations" section above
3. If unsure, check Telegram Topic 125 for recent alerts
4. Review latest audit report: `ls -lrt memory/token-audit-*.md | tail -1`

**If auto-refresh fails:**
1. Check logs: `tail ~/.openclaw/logs/token-refresh.log`
2. Run manual refresh for that service (see above)
3. Verify with health check
4. If still broken, check service dashboard (Meta, Withings, Google) for token revocation

---

**Last Verified:** 2026-04-08 14:00 CET  
**Next Audit:** 2026-04-14 (Sunday)  
**System Status:** ✅ All tokens healthy
