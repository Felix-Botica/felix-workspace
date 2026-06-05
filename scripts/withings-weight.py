#!/usr/bin/env python3
"""
Weight Fetcher — for the morning briefing.

PRIMARY source (since 2026-05-31): the local Apple Health file
workspace/data/applehealth-weight.json, pushed by an iOS Shortcut over SSH at
the morning weigh-in. The old Renpho → Apple-Health → Withings-cloud chain is
dead — Withings does not import third-party weight from Apple Health — so we now
read Apple Health directly and cut Withings out.

FALLBACK: the Withings cloud (getmeas) — only used if the Apple Health file is
missing/unreadable (e.g. before the Shortcut is set up). Auth mirrors
withings-sleep.py: WITHINGS_ACCESS_TOKEN + WITHINGS_USER_ID from .env (run
token-refresh.sh first).

Either way the *date* of the latest reading is surfaced so a stale/broken sync
is immediately visible. Never raises non-zero on "no data" so it can't fail the
briefing. (Filename kept as-is so cron-runner.sh needs no change.)
"""

import json
import os
import sys
import datetime as dt

import requests


# ── PRIMARY: Apple Health file (iOS Shortcut → SSH) ──────────────────────────
AH_LATEST = os.path.expanduser("~/.openclaw/workspace/data/applehealth-weight.json")
AH_HIST = os.path.expanduser("~/.openclaw/workspace/data/applehealth-weight-history.json")


def _try_apple_health():
    """Print the briefing weight line from the local Apple Health file.
    Returns True if it handled output (caller should exit), False to fall back
    to Withings."""
    try:
        with open(AH_LATEST, encoding="utf-8") as f:
            d = json.load(f)
        w = float(d["weight_kg"])
        when = dt.datetime.strptime(d["date"], "%Y-%m-%d")
    except (OSError, ValueError, KeyError, TypeError):
        return False

    age_days = (dt.datetime.now() - when).days
    line = f"⚖️ Gewicht: {w:.1f} kg (Stand {when.strftime('%d.%m.')}"
    if age_days >= 3:
        line += f", {age_days} Tage alt"
    line += ")"
    print(line)

    # Trend vs the previous distinct day from the history log.
    try:
        with open(AH_HIST, encoding="utf-8") as f:
            hist = json.load(f)
        prev = sorted(
            (h for h in hist if isinstance(h, dict)
             and "date" in h and "weight_kg" in h and h["date"] < d["date"]),
            key=lambda h: h["date"],
        )
        if prev:
            p = prev[-1]
            delta = w - float(p["weight_kg"])
            arrow = "▲" if delta > 0 else ("▼" if delta < 0 else "→")
            pwhen = dt.datetime.strptime(p["date"], "%Y-%m-%d").strftime("%d.%m.")
            print(f"   {arrow} {delta:+.1f} kg vs. {pwhen}")
    except (OSError, ValueError, KeyError, TypeError):
        pass

    if age_days >= 2:
        print(f"   ⚠️ Letzte Messung {age_days} Tage her — heute wiegen "
              f"(oder Apple-Health-Push prüfen: Shortcut/SSH).")
    return True


if _try_apple_health():
    sys.exit(0)
# else: fall through to the Withings cloud fallback below.


def _load_dotenv(path=None):
    path = path or os.path.expanduser('~/.openclaw/.env')
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, val = line.partition('=')
            os.environ[key.strip()] = val.strip().strip('"').strip("'")


_load_dotenv()

TOKEN = os.getenv('WITHINGS_ACCESS_TOKEN')
USER_ID = os.getenv('WITHINGS_USER_ID')

if not TOKEN or not USER_ID:
    print("Gewicht: nicht verfügbar (WITHINGS_ACCESS_TOKEN/USER_ID fehlt)")
    sys.exit(0)

# meastype: 1=Gewicht(kg), 6=Fett%, 8=Fettmasse(kg)
LOOKBACK_DAYS = 120
start = int((dt.datetime.now() - dt.timedelta(days=LOOKBACK_DAYS)).timestamp())
end = int(dt.datetime.now().timestamp())

try:
    resp = requests.post(
        "https://wbsapi.withings.net/measure",
        headers={"Authorization": f"Bearer {TOKEN}"},
        data={
            "action": "getmeas",
            "meastypes": "1,6,8",
            "category": 1,
            "startdate": start,
            "enddate": end,
            "user_id": USER_ID,
        },
        timeout=15,
    )
    data = resp.json()
except requests.exceptions.RequestException as e:
    print(f"Gewicht: nicht verfügbar (Netzwerkfehler: {e})")
    sys.exit(0)
except Exception as e:
    print(f"Gewicht: nicht verfügbar ({e})")
    sys.exit(0)

if data.get("status") != 0:
    print(f"Gewicht: nicht verfügbar (Withings status {data.get('status')})")
    sys.exit(0)

groups = data.get("body", {}).get("measuregrps", [])
# Keep only groups that actually contain a weight (type 1).
weight_groups = []
for g in groups:
    w = next((m for m in g.get("measures", []) if m.get("type") == 1), None)
    if w is not None:
        weight_groups.append((g.get("date", 0), g))
weight_groups.sort(key=lambda x: x[0], reverse=True)

if not weight_groups:
    print("Gewicht: keine Daten in Withings (Renpho→Withings-Sync prüfen)")
    sys.exit(0)


def _val(measure):
    return measure["value"] * (10 ** measure["unit"])


latest_ts, latest = weight_groups[0]
latest_w = _val(next(m for m in latest["measures"] if m["type"] == 1))
when = dt.datetime.fromtimestamp(latest_ts)
age_days = (dt.datetime.now() - when).days

line = f"⚖️ Gewicht: {latest_w:.1f} kg (Stand {when.strftime('%d.%m.')}"
if age_days >= 3:
    line += f", {age_days} Tage alt"
line += ")"
print(line)

# Trend vs the previous distinct reading.
if len(weight_groups) > 1:
    prev_ts, prev = weight_groups[1]
    prev_w = _val(next(m for m in prev["measures"] if m["type"] == 1))
    delta = latest_w - prev_w
    arrow = "▲" if delta > 0 else ("▼" if delta < 0 else "→")
    prev_when = dt.datetime.fromtimestamp(prev_ts).strftime('%d.%m.')
    print(f"   {arrow} {delta:+.1f} kg vs. {prev_when}")

# Body composition if present in the latest group.
fat_pct = next((m for m in latest["measures"] if m["type"] == 6), None)
if fat_pct is not None:
    print(f"   Körperfett: {_val(fat_pct):.1f}%")

if age_days >= 2:
    print(f"   ⚠️ Letzte Messung {age_days} Tage her — Renpho→Withings-Sync vermutlich inaktiv.")
