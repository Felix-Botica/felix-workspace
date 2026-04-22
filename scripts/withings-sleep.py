#!/usr/bin/env python3
"""
Withings Sleep Data Fetcher
Fetches last night's sleep summary from Withings API.
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta

# Load .env directly — don't rely on the shell having exported variables.
# Previously this script assumed `source .env && python3 ...` was enough, but
# plain `source` sets shell-local (non-exported) variables, which python3 can't
# see via os.getenv(). That mis-fired as "Token-Fehler 401" in the 07:30
# morning briefing on 2026-04-20 and 2026-04-21 — cause was actually just
# "env var not exported", not an auth failure.
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
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            # Don't overwrite existing env — caller-set wins over file.
            os.environ.setdefault(key, val)

_load_dotenv()

# Load environment variables
WITHINGS_ACCESS_TOKEN = os.getenv('WITHINGS_ACCESS_TOKEN')
WITHINGS_USER_ID = os.getenv('WITHINGS_USER_ID')

if not WITHINGS_ACCESS_TOKEN or not WITHINGS_USER_ID:
    print("Error: WITHINGS_ACCESS_TOKEN or WITHINGS_USER_ID not set in environment")
    sys.exit(1)

# Calculate date range: yesterday and today
today = datetime.now().strftime('%Y-%m-%d')
yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

# Fetch sleep data
url = "https://wbsapi.withings.net/v2/sleep"
headers = {"Authorization": f"Bearer {WITHINGS_ACCESS_TOKEN}"}
params = {
    "action": "getsummary",
    "startdateymd": yesterday,
    "enddateymd": today
}

try:
    response = requests.post(url, headers=headers, data=params, timeout=10)
    data = response.json()
    
    if data.get('status') != 0:
        print(f"Error: Withings API returned status {data.get('status')}")
        sys.exit(1)
    
    # Extract sleep data
    series = data.get('body', {}).get('series', [])
    
    if not series:
        print("Keine Schlafdaten verfügbar")
        sys.exit(0)
    
    # Get the most recent sleep session
    latest = series[-1]
    sleep_data = latest.get('data', {})
    
    # Convert seconds to hours:minutes
    def format_duration(seconds):
        if not seconds:
            return "0h 0m"
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours}h {minutes}m"
    
    total_sleep = format_duration(sleep_data.get('total_sleep_time', 0))
    time_in_bed = format_duration(sleep_data.get('total_timeinbed', 0))
    deep_sleep = format_duration(sleep_data.get('deepsleepduration', 0))
    light_sleep = format_duration(sleep_data.get('lightsleepduration', 0))
    efficiency = int(sleep_data.get('sleep_efficiency', 0) * 100)
    wakeup_count = sleep_data.get('wakeupcount', 0)
    
    # Output formatted summary
    print(f"🛏️ Zeit im Bett: {time_in_bed}")
    print(f"😴 Gesamtschlaf: {total_sleep}")
    print(f"🌙 Tiefschlaf: {deep_sleep}")
    print(f"💡 Leichtschlaf: {light_sleep}")
    print(f"⚡ Effizienz: {efficiency}%")
    print(f"🔢 Aufwachen: {wakeup_count}×")
    
except requests.exceptions.Timeout:
    print("Error: Withings API timeout")
    sys.exit(1)
except requests.exceptions.RequestException as e:
    print(f"Error: Network error - {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
