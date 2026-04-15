# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Integration Status — NEVER answer from memory!

When asked about the status of any integration (Twitter, Gmail, Withings, Instagram, etc.):
1. **Always run the check live** — `bash ~/.openclaw/integration_healthcheck.sh` or test the API directly
2. **Never answer from session memory** — tokens get refreshed, scripts get fixed, variable names change. Your memory of "Twitter is broken" may be hours or days stale.
3. **Read .env fresh** before testing: `source ~/.openclaw/.env`

### Known Issues (non-blocking)
- **X/Twitter OAuth2 Client Credentials** (`X_CLIENT_ID` / `X_CLIENT_SECRET`): Currently broken (`unauthorized_client`). Not needed — Felix only reads via Bearer Token (`X_BEARER_TOKEN`), which works. Only matters if/when we add tweet posting.

---

Add whatever helps you do your job. This is your cheat sheet.
