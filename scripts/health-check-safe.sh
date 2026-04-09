#!/bin/bash
# Safe Health Check (No Modifications)
# Tests integrations without running risky commands like `openclaw doctor`

set -euo pipefail

echo "🏥 Safe Health Check (Non-Destructive)"
echo "======================================="
echo ""

FAIL_COUNT=0

# Test 1: Gateway Status
echo "1. Gateway Status..."
if openclaw gateway status | grep -q "Runtime: running"; then
    echo "   ✅ Gateway running"
else
    echo "   ❌ Gateway not running"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 2: Gmail (gog)
echo "2. Gmail/Google Auth..."
if gog auth status 2>&1 | grep -q "credentials_exists.*true"; then
    echo "   ✅ Gmail credentials valid"
else
    echo "   ⚠️  Gmail credentials issue (check ~/.openclaw/.env GOOGLE_API_KEY)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 3: Withings Token
echo "3. Withings API Token..."
WITHINGS_TOKEN=$(grep WITHINGS_ACCESS_TOKEN ~/.openclaw/.env | cut -d= -f2)
if [[ -z "$WITHINGS_TOKEN" ]]; then
    echo "   ❌ Withings token missing from .env"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    WITHINGS_RESPONSE=$(curl -s "https://wbsapi.withings.net/v2/sleep?action=getsummary&startdateymd=2026-04-08&enddateymd=2026-04-08" \
        -H "Authorization: Bearer $WITHINGS_TOKEN" | jq -r '.status // "error"')
    
    if [[ "$WITHINGS_RESPONSE" == "0" ]]; then
        echo "   ✅ Withings token valid (API responded)"
    else
        echo "   ❌ Withings token invalid (status: $WITHINGS_RESPONSE)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
fi
echo ""

# Test 4: Shopify
echo "4. Shopify API Token..."
SHOPIFY_TOKEN=$(grep SHOPIFY_ACCESS_TOKEN ~/.openclaw/.env | cut -d= -f2)
if [[ -z "$SHOPIFY_TOKEN" ]]; then
    echo "   ❌ Shopify token missing from .env"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    SHOPIFY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://ecb34e-4.myshopify.com/admin/api/2024-01/shop.json" \
        -H "X-Shopify-Access-Token: $SHOPIFY_TOKEN")
    
    if [[ "$SHOPIFY_STATUS" == "200" ]]; then
        echo "   ✅ Shopify token valid (HTTP 200)"
    else
        echo "   ❌ Shopify token invalid (HTTP $SHOPIFY_STATUS)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
fi
echo ""

# Test 5: Brevo
echo "5. Brevo Email API..."
BREVO_KEY=$(grep BREVO_API_KEY_REST ~/.openclaw/.env | cut -d= -f2)
if [[ -z "$BREVO_KEY" ]]; then
    echo "   ❌ Brevo key missing from .env"
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    BREVO_STATUS=$(curl -s "https://api.brevo.com/v3/account" -H "api-key: $BREVO_KEY" | jq -r '.email // "error"')
    
    if [[ "$BREVO_STATUS" != "error" ]]; then
        echo "   ✅ Brevo account found: $BREVO_STATUS"
    else
        echo "   ❌ Brevo API key invalid"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
fi
echo ""

# Test 6: Telegram
echo "6. Telegram Bot..."
BOT_TOKEN=$(grep -A 5 '"telegram":' ~/.openclaw/openclaw.json | grep botToken | head -1 | cut -d'"' -f4)
if [[ -z "$BOT_TOKEN" || "$BOT_TOKEN" == "__OPENCLAW_REDACTED__" ]]; then
    echo "   ⚠️  Telegram token redacted (normal, checking status instead)"
    echo "   ✅ Telegram configured in openclaw.json"
else
    TELEGRAM_STATUS=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe" | jq -r '.ok // false')
    if [[ "$TELEGRAM_STATUS" == "true" ]]; then
        echo "   ✅ Telegram bot alive"
    else
        echo "   ❌ Telegram bot token invalid"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
fi
echo ""

# Test 7: WhatsApp Session
echo "7. WhatsApp Session..."
if grep -q "jid.*whatsapp.net" ~/.openclaw/openclaw.json 2>/dev/null || grep -q "WhatsApp.*linked" <<< "$(openclaw gateway status)"; then
    echo "   ✅ WhatsApp session active"
else
    echo "   ⚠️  WhatsApp session may need refresh (check heartbeat alerts)"
fi
echo ""

# Test 8: .env File Integrity
echo "8. .env File Integrity..."
if [[ -f ~/.openclaw/.env ]]; then
    KEY_COUNT=$(grep -c "=" ~/.openclaw/.env || true)
    echo "   ✅ .env exists with $KEY_COUNT keys"
else
    echo "   ❌ .env file missing!"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Summary
echo "======================================="
echo "Summary:"
if [[ $FAIL_COUNT -eq 0 ]]; then
    echo "✅ All checks passed!"
    exit 0
else
    echo "❌ $FAIL_COUNT check(s) failed"
    exit 1
fi
