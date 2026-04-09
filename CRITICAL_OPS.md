# CRITICAL_OPS.md — Safe Operation Procedures

## 🚨 Golden Rules

1. **NEVER run `openclaw doctor` automatically** — it can corrupt `.env` and `openclaw.json`
2. **Always backup before risky changes** — use `scripts/backup-critical-files.sh`
3. **Use `gateway config.patch` for config changes** — not `openclaw doctor --fix`
4. **Test with `scripts/health-check-safe.sh` first** — no destructive changes
5. **Keep `openclaw.json` and `.env` in version control** — recovery is fast

---

## Safe Workflows

### Before Any Major Change

```bash
# 1. Backup
~/.openclaw/workspace/scripts/backup-critical-files.sh "description-of-change"

# 2. Health check (verify everything works now)
~/.openclaw/workspace/scripts/health-check-safe.sh

# 3. Make the change (via config.patch or manual edit)
# 4. Verify with health check again
~/.openclaw/workspace/scripts/health-check-safe.sh
```

### Fixing Config Issues

❌ **NEVER do this:**
```bash
openclaw doctor          # Risky, modifies config
openclaw doctor --fix    # Extra risky, auto-fixes unknowns
```

✅ **DO this instead:**
```bash
# Option 1: Use config.patch (safest, transparent)
gateway config.patch '{"agents": {"defaults": {"model": {"primary": "google/gemini-2.5-flash"}}}}'

# Option 2: Manually edit ~/.openclaw/openclaw.json (full control)
# Then restart:
openclaw gateway restart
```

### Token Refresh Issues

```bash
# Auto-refresh Withings (already set up)
~/.openclaw/workspace/scripts/token-refresh.sh

# Manual WhatsApp refresh (requires QR scan)
openclaw channels login whatsapp

# Instagram token refresh (not yet automated)
# TBD: needs Meta API refresh implementation
```

### Health Monitoring (Safe, No Changes)

```bash
# Run this anytime, no risk:
~/.openclaw/workspace/scripts/health-check-safe.sh

# Or manually check one service:
curl -s "https://wbsapi.withings.net/v2/sleep?action=getsummary&startdateymd=TODAY&enddateymd=TODAY" \
  -H "Authorization: Bearer $(grep WITHINGS_ACCESS_TOKEN ~/.openclaw/.env | cut -d= -f2)"
```

---

## Recovery from Corruption

If `.env` or `openclaw.json` gets corrupted:

```bash
# 1. List recent backups
ls -lht ~/.openclaw/backups/

# 2. Restore both files
cp ~/.openclaw/backups/.env.TIMESTAMP.OPERATION.backup ~/.openclaw/.env
cp ~/.openclaw/backups/openclaw.json.TIMESTAMP.OPERATION.backup ~/.openclaw/openclaw.json

# 3. Restart gateway
openclaw gateway restart

# 4. Verify
openclaw gateway status
~/.openclaw/workspace/scripts/health-check-safe.sh
```

---

## What Each Script Does

### `backup-critical-files.sh [operation_name]`
- Copies `.env` and `openclaw.json` with timestamp
- Creates recovery manifest
- Safe to run anytime (read-only on source files)

### `safe-config-patch.sh "description" "JSON_patch"`
- Backs up first
- Applies config patch via gateway API
- Shows result or recovery instructions

### `health-check-safe.sh`
- Tests all integrations (read-only)
- No changes to any files
- Safe to run anytime, even in cron

### `token-refresh.sh`
- Refreshes Withings token
- Safe (doesn't affect other tokens)
- Run manually or via cron (every 2 hours)

---

## When to Use Each Command

| Task | Command | Risk | When |
|------|---------|------|------|
| Check status | `health-check-safe.sh` | ✅ None | Anytime |
| Change config | `gateway config.patch` | 🟡 Low | Before testing |
| Add backup | `backup-critical-files.sh` | ✅ None | Before any risky op |
| Restart gateway | `openclaw gateway restart` | 🟡 Medium | After config change |
| Refresh tokens | `token-refresh.sh` | 🟡 Medium | On-demand or cron |
| **AVOID: Run doctor** | **`openclaw doctor`** | 🔴 **HIGH** | **Never (unless explicit OK)** |
| **AVOID: Auto-fix** | **`openclaw doctor --fix`** | 🔴 **CRITICAL** | **Never** |

---

## Backup Directory Structure

```
~/.openclaw/backups/
├── .env.2026-04-08_13-52-00.switch-to-minimax.backup
├── .env.2026-04-08_13-52-05.enable-redis.backup
├── openclaw.json.2026-04-08_13-52-00.switch-to-minimax.backup
├── openclaw.json.2026-04-08_13-52-05.enable-redis.backup
├── MANIFEST.2026-04-08_13-52-00.switch-to-minimax.txt
└── MANIFEST.2026-04-08_13-52-05.enable-redis.txt
```

Each backup has:
- Timestamp (`YYYY-MM-DD_HH-MM-SS`)
- Operation name (for identification)
- Manifest with recovery instructions

---

## Cron Jobs Using These Scripts

```bash
# Token refresh (every 2 hours)
0 */2 * * * ~/.openclaw/workspace/scripts/token-refresh.sh >> ~/.openclaw/logs/token-refresh.log 2>&1

# Health check (daily at 09:00)
0 9 * * * ~/.openclaw/workspace/scripts/health-check-safe.sh >> ~/.openclaw/logs/health-check.log 2>&1
```

---

## Questions?

- **"Can I run health-check during production?"** → Yes, 100% safe
- **"What if backup fails?"** → Rollback manually from previous version
- **"Can I restore partial backups?"** → Yes, restore individual files
- **"Do backups get cleaned up?"** → No, keep them for history. Delete manually if disk full
- **"What if gateway is stuck?"** → Restore backup + restart = 2 minutes recovery

