#!/bin/bash
# Token Refresh Script for Withings & Twitter
# Runs proactively to prevent token expiration

set -e
source ~/.openclaw/.env

LOG_FILE="/tmp/openclaw/token-refresh.log"
mkdir -p /tmp/openclaw
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Token refresh started" >> "$LOG_FILE"

REFRESHED=()
FAILED=()

# 1. WITHINGS TOKEN REFRESH
# Withings tokens expire after 3 hours, refresh token lasts 6 months
if [ -n "$WITHINGS_REFRESH_TOKEN" ]; then
  echo "Refreshing Withings token..." >> "$LOG_FILE"
  
  RESPONSE=$(curl -s -X POST "https://wbsapi.withings.net/v2/oauth2" \
    -d "action=requesttoken" \
    -d "client_id=$WITHINGS_CLIENT_ID" \
    -d "client_secret=$WITHINGS_CLIENT_SECRET" \
    -d "grant_type=refresh_token" \
    -d "refresh_token=$WITHINGS_REFRESH_TOKEN")
  
  STATUS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',999))" 2>/dev/null || echo "999")
  
  if [ "$STATUS" == "0" ]; then
    NEW_ACCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['body']['access_token'])" 2>/dev/null)
    NEW_REFRESH=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['body']['refresh_token'])" 2>/dev/null)
    
    if [ -n "$NEW_ACCESS" ] && [ -n "$NEW_REFRESH" ]; then
      # Backup .env once (overwrite previous backup), then update in-place
      cp ~/.openclaw/.env ~/.openclaw/.env.bak
      sed -i '' "s|WITHINGS_ACCESS_TOKEN=.*|WITHINGS_ACCESS_TOKEN=$NEW_ACCESS|" ~/.openclaw/.env
      sed -i '' "s|WITHINGS_REFRESH_TOKEN=.*|WITHINGS_REFRESH_TOKEN=$NEW_REFRESH|" ~/.openclaw/.env

      REFRESHED+=("✅ Withings token refreshed")
      echo "  ✅ Success" >> "$LOG_FILE"
    else
      FAILED+=("❌ Withings: Could not extract new tokens")
      echo "  ❌ Failed: Empty tokens" >> "$LOG_FILE"
    fi
  else
    FAILED+=("❌ Withings: API returned status $STATUS")
    echo "  ❌ Failed: Status $STATUS" >> "$LOG_FILE"
  fi
else
  echo "  ⚠️  Withings refresh token not found" >> "$LOG_FILE"
fi

# 2. TWITTER TOKEN CHECK
# Twitter OAuth 1.0a tokens don't expire and don't need refresh
# Just verify env vars exist (actual validation happens in integration-healthcheck)
if [ -n "$X_ACCESS_TOKEN" ] && [ -n "$X_CONSUMER_KEY" ]; then
  echo "Twitter OAuth 1.0a tokens present..." >> "$LOG_FILE"
  REFRESHED+=("✅ Twitter tokens present (OAuth 1.0a, no refresh needed)")
  echo "  ✅ Present" >> "$LOG_FILE"
else
  FAILED+=("⚠️ Twitter: OAuth tokens missing from .env")
  echo "  ⚠️ Missing" >> "$LOG_FILE"
fi

# 3. GENERATE REPORT
if [ ${#FAILED[@]} -gt 0 ]; then
  # Alert Lothar in Dev & Pipeline
  MSG="🔄 **Token Refresh Alert**\n\n"
  
  if [ ${#REFRESHED[@]} -gt 0 ]; then
    MSG+="**Refreshed:**\n"
    for r in "${REFRESHED[@]}"; do MSG+="$r\n"; done
    MSG+="\n"
  fi
  
  if [ ${#FAILED[@]} -gt 0 ]; then
    MSG+="**Failed:**\n"
    for f in "${FAILED[@]}"; do MSG+="$f\n"; done
    MSG+="\n**Action:** Manual re-auth may be needed."
  fi
  
  echo -e "$MSG" > /tmp/openclaw/token-refresh-alert.txt
  echo "Alert written" >> "$LOG_FILE"
  exit 1
else
  if [ ${#REFRESHED[@]} -gt 0 ]; then
    # Success, log but don't alert
    echo "All tokens refreshed successfully" >> "$LOG_FILE"
  fi
  rm -f /tmp/openclaw/token-refresh-alert.txt
  exit 0
fi
