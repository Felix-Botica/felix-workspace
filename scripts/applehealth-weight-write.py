#!/usr/bin/env python3
"""
Apple Health Weight Writer — receives the latest body-weight reading pushed
from an iOS Shortcut over SSH and persists it for the morning briefing.

Background: the Renpho → Apple-Health → Withings-cloud chain is dead (Withings
does not import third-party weight from Apple Health). The correct, current
weight already lives in Apple Health, so we read it directly and cut Withings
out. An iOS Shortcut (run at the morning weigh-in) reads the most recent
Body-Mass sample and calls this script over SSH:

    /opt/homebrew/bin/python3 \\
      ~/.openclaw/workspace/scripts/applehealth-weight-write.py "<weight>" "<iso-date-or-datetime>"

<weight> may be "85.9", "85,9", or "85.9 kg" — we normalise. <date> is optional
(defaults to now). Two files are written in workspace/data/:
  - applehealth-weight.json          latest reading (what withings-weight.py reads)
  - applehealth-weight-history.json  deduped-by-date log (for the trend arrow)

Validates the value is a plausible body weight (30–300 kg) so a malformed push
can never poison the briefing.
"""
import json
import os
import re
import sys
import datetime as dt

DATA = os.path.expanduser("~/.openclaw/workspace/data")
LATEST = os.path.join(DATA, "applehealth-weight.json")
HIST = os.path.join(DATA, "applehealth-weight-history.json")
HIST_KEEP = 120
MIN_KG, MAX_KG = 30.0, 300.0


def parse_weight(raw):
    s = str(raw).strip().replace(",", ".")
    m = re.search(r"-?\d+(?:\.\d+)?", s)
    if not m:
        raise ValueError(f"no number in weight arg: {raw!r}")
    w = float(m.group(0))
    if not (MIN_KG <= w <= MAX_KG):
        raise ValueError(f"weight {w} out of plausible range {MIN_KG}-{MAX_KG} kg")
    return w


def parse_when(raw):
    if not raw or not str(raw).strip():
        return dt.datetime.now()
    s = str(raw).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M",
                "%Y-%m-%d", "%d.%m.%Y %H:%M", "%d.%m.%Y", "%d.%m.%y"):
        try:
            return dt.datetime.strptime(s, fmt)
        except ValueError:
            continue
    try:
        return dt.datetime.fromisoformat(s.replace("Z", ""))
    except ValueError:
        return dt.datetime.now()


def _read_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def _atomic_write(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def main():
    # Weight may arrive as argv[1] (CLI/SSH command arg) OR on stdin (the iOS
    # Shortcut's "Eingabe/Input" field piped to the command). Accept both.
    raw_w = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].strip() else None
    if raw_w is None and not sys.stdin.isatty():
        raw_w = sys.stdin.readline()
    if not raw_w or not str(raw_w).strip():
        print("usage: applehealth-weight-write.py <weight> [<iso-date>]  "
              "(or pipe the weight on stdin)", file=sys.stderr)
        return 2
    w = parse_weight(raw_w)
    when = parse_when(sys.argv[2] if len(sys.argv) > 2 else None)
    os.makedirs(DATA, exist_ok=True)
    date_str = when.strftime("%Y-%m-%d")

    latest = {
        "weight_kg": round(w, 2),
        "date": date_str,
        "ts": when.strftime("%Y-%m-%dT%H:%M:%S"),
        "received_at": dt.datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "source": "apple-health-shortcut-ssh",
    }
    _atomic_write(LATEST, latest)

    # history: dedupe by date (keep the latest push per calendar day), trim.
    hist = _read_json(HIST, [])
    if not isinstance(hist, list):
        hist = []
    hist = [h for h in hist if isinstance(h, dict) and h.get("date") != date_str]
    hist.append({"date": date_str, "weight_kg": round(w, 2), "ts": latest["ts"]})
    hist.sort(key=lambda h: h.get("date", ""))
    hist = hist[-HIST_KEEP:]
    _atomic_write(HIST, hist)

    print(f"OK {w:.2f} kg @ {date_str}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERR {exc}", file=sys.stderr)
        sys.exit(1)
