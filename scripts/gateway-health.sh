#!/usr/bin/env bash
# gateway-health.sh — ping OpenClaw gateway, alert via Telegram if down
# Runs outside the gateway (cron every 5 min)
# Usage: */5 * * * * ~/.openclaw/workspace/scripts/gateway-health.sh

set -euo pipefail

HOST="localhost"
PORT=18789
TIMEOUT=10
STATE_FILE="$HOME/.openclaw/workspace/scripts/.gateway-health-state"

# Telegram alert config (from openclaw.json)
TG_BOT_TOKEN="8129988237:AAFuQcHXgc1rVFPXn28-DTT4_vcyY1qc7Vk"
TG_CHAT_ID="287505381"

send_alert() {
    local msg="$1"
    curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TG_CHAT_ID}" \
        -d text="${msg}" \
        -d parse_mode="Markdown" >/dev/null 2>&1
}

# Read previous state (up/down)
prev_state="up"
[ -f "$STATE_FILE" ] && prev_state=$(cat "$STATE_FILE")

# Health check — TCP connectivity (gateway returns 500 on all HTTP endpoints but is healthy if port responds)
if nc -z -w "$TIMEOUT" "$HOST" "$PORT" 2>/dev/null; then
    gateway_up=true
else
    gateway_up=false
fi

now=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$gateway_up" = true ]; then
    if [ "$prev_state" = "down" ]; then
        send_alert "✅ *Gateway recovered* at ${now}"
    fi
    echo "up" > "$STATE_FILE"
else
    if [ "$prev_state" != "down" ]; then
        send_alert "🔴 *Gateway DOWN* at ${now}
Port ${PORT} not responding on ${HOST}"
    fi
    echo "down" > "$STATE_FILE"
fi
