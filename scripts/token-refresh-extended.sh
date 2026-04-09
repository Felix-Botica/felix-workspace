#!/bin/bash
# Extended Token Refresh Script
# Handles Withings, Instagram, Google, and WhatsApp token lifecycle
# Run: ./token-refresh-extended.sh [--dry-run] [--force-all]

set -euo pipefail

ENV_FILE="$HOME/.openclaw/.env"
LOG_FILE="$HOME/.openclaw/logs/token-refresh.log"
STATE_FILE="$HOME/.openclaw/workspace/memory/tokens.json"

mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$STATE_FILE")"

# Parse arguments
DRY_RUN=0
FORCE_ALL=0
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=1; shift ;;
        --force-all) FORCE_ALL=1; shift ;;
        *) shift ;;
    esac
done

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "========== Token Refresh Cycle $(if [[ $DRY_RUN == 1 ]]; then echo "[DRY-RUN]"; fi) =========="

# Source .env
if [[ ! -f "$ENV_FILE" ]]; then
    log "ERROR: .env file not found at $ENV_FILE"
    exit 1
fi
source "$ENV_FILE"

# Initialize or load token state
init_token_state() {
    if [[ ! -f "$STATE_FILE" ]]; then
        cat > "$STATE_FILE" << 'EOF'
{
  "tokens": {
    "withings": {
      "last_refreshed": null,
      "next_expiry": null,
      "refresh_method": "oauth_refresh",
      "days_until_expiry": null,
      "auto_refresh": true,
      "alert_threshold_days": 14,
      "status": "pending_first_refresh"
    },
    "instagram": {
      "last_refreshed": null,
      "next_expiry": null,
      "refresh_method": "api_refresh",
      "days_until_expiry": 60,
      "auto_refresh": true,
      "alert_threshold_days": 7,
      "status": "pending_first_refresh"
    },
    "google": {
      "last_refreshed": null,
      "next_expiry": null,
      "refresh_method": "gog_auto",
      "days_until_expiry": null,
      "auto_refresh": true,
      "alert_threshold_days": 30,
      "status": "pending_verification"
    },
    "whatsapp": {
      "last_refreshed": null,
      "next_expiry": null,
      "refresh_method": "manual_qr_scan",
      "days_until_expiry": 14,
      "auto_refresh": false,
      "alert_threshold_days": 2,
      "status": "manual_only"
    }
  },
  "last_updated": null,
  "next_scheduled_refresh": null
}
EOF
        log "Initialized new token state file"
    fi
}

# Refresh Withings Token
refresh_withings() {
    log "Refreshing Withings token..."
    
    if [[ -z "${WITHINGS_REFRESH_TOKEN:-}" ]]; then
        log "❌ Withings refresh token not found in .env"
        return 1
    fi
    
    RESPONSE=$(curl -s -X POST "https://wbsapi.withings.net/v2/oauth2" \
        -d "action=requesttoken" \
        -d "grant_type=refresh_token" \
        -d "client_id=${WITHINGS_CLIENT_ID}" \
        -d "client_secret=${WITHINGS_CLIENT_SECRET}" \
        -d "refresh_token=${WITHINGS_REFRESH_TOKEN}")
    
    STATUS=$(echo "$RESPONSE" | jq -r '.status // "error"')
    
    if [[ "$STATUS" == "0" ]]; then
        NEW_ACCESS=$(echo "$RESPONSE" | jq -r '.body.access_token')
        NEW_REFRESH=$(echo "$RESPONSE" | jq -r '.body.refresh_token')
        EXPIRES_IN=$(echo "$RESPONSE" | jq -r '.body.expires_in // "10800"')
        
        if [[ $DRY_RUN == 0 ]]; then
            sed -i '' "s/WITHINGS_ACCESS_TOKEN=.*/WITHINGS_ACCESS_TOKEN=$NEW_ACCESS/" "$ENV_FILE"
            sed -i '' "s/WITHINGS_REFRESH_TOKEN=.*/WITHINGS_REFRESH_TOKEN=$NEW_REFRESH/" "$ENV_FILE"
        fi
        
        EXPIRY_DATE=$(date -u -v+${EXPIRES_IN}s +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+${EXPIRES_IN}s" +"%Y-%m-%dT%H:%M:%SZ")
        log "✅ Withings token refreshed (expires: $EXPIRY_DATE)"
        
        return 0
    else
        log "❌ Withings token refresh failed: $RESPONSE"
        return 1
    fi
}

# Check Instagram Token (long-lived, 60-day expiry)
check_instagram_token() {
    log "Checking Instagram token..."
    
    if [[ -z "${META_ACCESS_TOKEN:-}" ]]; then
        log "⚠️  Instagram token not found in .env"
        return 1
    fi
    
    # Test token validity
    RESPONSE=$(curl -s "https://graph.instagram.com/me?fields=id,username&access_token=${META_ACCESS_TOKEN}" 2>/dev/null)
    
    if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        log "✅ Instagram token is valid"
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error.message // "unknown error"')
        log "❌ Instagram token invalid: $ERROR"
        return 1
    fi
}

# Refresh Instagram Token (if API supports it)
refresh_instagram() {
    log "Attempting Instagram token refresh via Meta API..."
    
    if [[ -z "${META_ACCESS_TOKEN:-}" ]]; then
        log "⚠️  Instagram token not available for refresh"
        return 1
    fi
    
    # Meta's long-lived token refresh endpoint
    RESPONSE=$(curl -s -X GET "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${META_ACCESS_TOKEN}" 2>/dev/null)
    
    if echo "$RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
        NEW_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
        EXPIRES_IN=$(echo "$RESPONSE" | jq -r '.expires_in // 5184000')  # 60 days default
        
        if [[ $DRY_RUN == 0 ]]; then
            sed -i '' "s/META_ACCESS_TOKEN=.*/META_ACCESS_TOKEN=$NEW_TOKEN/" "$ENV_FILE"
        fi
        
        EXPIRY_DATE=$(date -u -v+${EXPIRES_IN}s +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+${EXPIRES_IN}s" +"%Y-%m-%dT%H:%M:%SZ")
        log "✅ Instagram token refreshed (expires: $EXPIRY_DATE)"
        
        return 0
    else
        log "⚠️  Instagram token refresh not available or failed (token may be long-lived already)"
        check_instagram_token
        return $?
    fi
}

# Check Google OAuth (via gog)
check_google_oauth() {
    log "Checking Google OAuth credentials..."
    
    if gog auth status 2>&1 | grep -q "credentials_exists.*true"; then
        log "✅ Google OAuth credentials valid"
        # Note: gog handles OAuth refresh automatically
        return 0
    else
        log "⚠️  Google OAuth credentials may need refresh"
        return 1
    fi
}

# Check WhatsApp Session (manual only, but alert before expiry)
check_whatsapp_session() {
    log "Checking WhatsApp session status..."
    
    # WhatsApp sessions expire after 14 days of inactivity
    # We can check the last activity timestamp from openclaw
    if grep -q "whatsapp.net" ~/.openclaw/openclaw.json 2>/dev/null; then
        log "✅ WhatsApp session appears active"
        # TODO: Get actual expiry time from OpenClaw if possible
        return 0
    else
        log "⚠️  WhatsApp session may need refresh (run: openclaw channels login whatsapp)"
        return 1
    fi
}

# Update token state file
update_token_state() {
    local token_name=$1
    local status=$2
    local days_until=$3
    
    if [[ -f "$STATE_FILE" ]]; then
        # Using jq to safely update JSON
        jq ".tokens[\"$token_name\"].status = \"$status\" | .tokens[\"$token_name\"].days_until_expiry = $days_until | .last_updated = \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"" "$STATE_FILE" > "${STATE_FILE}.tmp"
        if [[ $DRY_RUN == 0 ]]; then
            mv "${STATE_FILE}.tmp" "$STATE_FILE"
        fi
    fi
}

# Main execution
init_token_state

FAILED_COUNT=0

# Refresh each token
if refresh_withings; then
    update_token_state "withings" "✅ refreshed" "10800"
else
    update_token_state "withings" "❌ failed" "unknown"
    FAILED_COUNT=$((FAILED_COUNT + 1))
fi

if refresh_instagram; then
    update_token_state "instagram" "✅ refreshed" "60"
else
    update_token_state "instagram" "⚠️ check_failed" "unknown"
fi

if check_google_oauth; then
    update_token_state "google" "✅ valid" "unknown"
else
    update_token_state "google" "⚠️ needs_check" "unknown"
    FAILED_COUNT=$((FAILED_COUNT + 1))
fi

if check_whatsapp_session; then
    update_token_state "whatsapp" "✅ active" "14"
else
    update_token_state "whatsapp" "⚠️ check_manually" "14"
fi

log ""
log "========== Cycle Complete =========="
if [[ $FAILED_COUNT -gt 0 ]]; then
    log "⚠️  $FAILED_COUNT token(s) need attention"
    exit 1
else
    log "✅ All tokens checked/refreshed successfully"
    exit 0
fi
