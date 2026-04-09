#!/bin/bash
# Auto Token Refresh Script
# Refreshes API tokens that support automatic renewal
# Run every 2 hours via cron

set -euo pipefail

ENV_FILE="$HOME/.openclaw/.env"
LOG_FILE="$HOME/.openclaw/logs/token-refresh.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Source .env to get current tokens
if [[ ! -f "$ENV_FILE" ]]; then
    log "ERROR: .env file not found at $ENV_FILE"
    exit 1
fi

source "$ENV_FILE"

# Refresh Withings Token
refresh_withings() {
    log "Refreshing Withings token..."
    
    RESPONSE=$(curl -s -X POST "https://wbsapi.withings.net/v2/oauth2" \
        -d "action=requesttoken" \
        -d "grant_type=refresh_token" \
        -d "client_id=$WITHINGS_CLIENT_ID" \
        -d "client_secret=$WITHINGS_CLIENT_SECRET" \
        -d "refresh_token=$WITHINGS_REFRESH_TOKEN")
    
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    
    if [[ "$STATUS" == "0" ]]; then
        NEW_ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.body.access_token')
        NEW_REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.body.refresh_token')
        
        # Update .env file
        sed -i '' "s/WITHINGS_ACCESS_TOKEN=.*/WITHINGS_ACCESS_TOKEN=$NEW_ACCESS_TOKEN/" "$ENV_FILE"
        sed -i '' "s/WITHINGS_REFRESH_TOKEN=.*/WITHINGS_REFRESH_TOKEN=$NEW_REFRESH_TOKEN/" "$ENV_FILE"
        
        log "✅ Withings token refreshed successfully"
    else
        log "❌ Withings token refresh failed: $RESPONSE"
        # Alert Lothar in Felix HQ Health topic
        openclaw message send --channel telegram --topic 125 --message "⚠️ Withings token refresh failed. Manual intervention needed."
    fi
}

# Main execution
log "Starting token refresh cycle"

refresh_withings

# Add more token refresh functions here as needed
# Example: refresh_google_oauth, refresh_shopify, etc.

log "Token refresh cycle completed"
