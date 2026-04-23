# ACCOUNT_RULES.md — Single source of truth for Instagram account posting rules

> **This file is canonical. If a rule here contradicts any other file or any agent's memory, THIS FILE WINS.**
> Scripts enforce these rules at runtime. See "Enforcement" at bottom.

Last updated: 2026-04-22 (Refactor C — config-driven)

---

## ACTIVE accounts (OK to post to)

| Handle | IG ID | Style routing | Status |
|---|---|---|---|
| @nylondarling | 17841429713561331 | editorial / lifestyle / elegant — flagship | ✅ active |
| @nylongerie | 17841402986367027 | product shots, brand hub | ✅ active |
| @legfashion | 17841402884847036 | legs-focus | ✅ active |
| @shinynylonstar | 17841464191117228 | shiny-glossy | ✅ active |
| @blackshinynylon | 17841471823236920 | black / dark nylon | ✅ active |
| @nextdoornylon | 17841472299535162 | casual / girl-next-door | ✅ active |
| @planetnylon | 17841472009081615 | edgy (leather / vinyl / boots) | ✅ active |

## PAUSED accounts (NEVER post to)

| Handle | IG ID | Reason | Since |
|---|---|---|---|
| **@nyloncherie** | 17841402906657029 | Copyright + political sensitivity (profile branding depicts a real third party, ex-partner of Uwe Schröder). Lothar has flagged this repeatedly — "Finger weg bis auf Weiteres." | 2026-03-09 |

### Hard rules for paused accounts

1. **Never select** an image for a paused account in any selection script (posts, reels, stories).
2. **Never publish** a queue entry whose `account` is a paused account — even if it was human-approved. The publish script refuses.
3. **Never re-introduce** a paused account to an `ACCOUNTS` / routing config in any script. Scripts run a startup assertion and will throw if a paused account appears in config.
4. Mentioning a paused account in a **hashtag or follow-suggestion** in another post's caption is allowed (it's a social signal, not a posting action). Example: `#nyloncherie` in a @nylondarling caption is fine.
5. Un-pausing requires Lothar's **written** approval. Felix/Nylongerie agents have no authority to reverse this.

---

## Enforcement (where the rules actually live in code)

**As of Refactor C (2026-04-22), the PAUSED_ACCOUNTS list has a single source of truth:** `config/nylongerie.json` → `accounts.paused[]`. All scripts import it via `lib/paused_accounts.js`. No more drift risk across scripts.

| Layer | File | Enforcement |
|---|---|---|
| 1. Selection (POST) | `pipelines/post/select.js` | `assertNoPausedIn()` on active accounts at startup; mid-loop filter skips paused handles. |
| 2. Selection (REEL) | `workspace/nylongerie-create-reel-batch.js` | Still uses local `PAUSED_ACCOUNTS = ['nyloncherie']` constant — working but not yet config-driven (scheduled for future refactor). `routeToAccount()` skips paused matches; round-robin fallback excludes paused accounts. |
| 3. Selection (STORY) | `pipelines/story/promo.js` | Reads config; `assertNoPausedIn()` on `story.rules.rotation_order` at startup. |
| 4. Publish (final gate, POST + REEL) | `pipelines/post/publish.js` | Every queue entry checked via `PAUSED_ACCOUNTS` from config; paused targets marked `status=refused_paused_account` and never hit Instagram API. |
| 5. Preflight | `scripts/preflight.sh` | Runs before every cron; refuses if any invariant is broken (including paused-in-active). |

### When Felix (or any agent) needs to reason about accounts

- Read this file. Do not read caption templates or memory `.md` files that duplicate the paused list — those are not authoritative.
- Do not "helpfully" re-enable a paused account because a script appears to be broken or a draft seems useful. Report to Lothar instead.

---

## Related canonical files

- `workspace/NYLONGERIE_PIPELINE.md` — the full posting workflow (how to select, craft, publish). Canonical.
- `workspace-nylongerie/PIPELINE.md` — should be a thin pointer to the above; do not duplicate content here.
- `workspace/OPERATIONS.md` — integrations, API usage, rate limits. References this file for account rules.

## How to resolve contradictions

If any doc / caption template / script config disagrees with the tables above:
1. This file is right.
2. Fix the other location to match.
3. Note the correction in this file's changelog (add a `### 2026-MM-DD — change X` entry below).

### Changelog

- **2026-04-21** — Created. Hard-wired `PAUSED_ACCOUNTS = ['nyloncherie']` with runtime enforcement in select-v3.js, reel-batch.js, and publish.js after a POST cron at 10:04 CEST proposed @nyloncherie as draft #2 (caught at approval; never published). Added round-robin rotation fallback in reel-batch.js so unclassified reels no longer pile on @nylondarling. Removed @nyloncherie caption template from NYLONGERIE_PIPELINE.md.
- **2026-04-22** — Refactor C. PAUSED_ACCOUNTS now lives in `config/nylongerie.json` (single source of truth) and is read by all scripts via `lib/paused_accounts.js`. POST + STORY scripts migrated to `pipelines/post/` and `pipelines/story/`. Old nylongerie/* scripts replaced with deprecated stubs that exit 2. STORY pipeline also gained product cooldown (14d) + rotation bug fix (was stuck on @nylondarling every new day). POST pipeline gained cross-account cooldown (7d) + max-accounts-per-image cap (3/90d) + rejected-draft lock (30d) + same-day idempotency guard.
