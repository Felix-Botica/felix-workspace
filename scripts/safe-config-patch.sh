#!/bin/bash
# Safe Config Patch
# Backs up critical files, then applies a config patch
# Usage: ./safe-config-patch.sh "description" "JSON_patch"
# Example: ./safe-config-patch.sh "Enable Bedrock" '{"plugins": {"entries": {"amazon-bedrock": {"enabled": true}}}}'

set -euo pipefail

DESCRIPTION="${1:-unknown}"
JSON_PATCH="${2:-}"

if [[ -z "$JSON_PATCH" ]]; then
    echo "Usage: $0 \"description\" \"JSON_patch\""
    echo "Example: $0 \"Switch to Gemini\" '{\"agents\": {\"defaults\": {\"model\": {\"primary\": \"google/gemini-2.5-flash\"}}}}'"
    exit 1
fi

echo "🔐 Safe Config Patch"
echo "===================="
echo "Description: $DESCRIPTION"
echo "Patch: $JSON_PATCH"
echo ""

# Step 1: Backup
echo "Step 1: Backing up critical files..."
~/.openclaw/workspace/scripts/backup-critical-files.sh "$DESCRIPTION"

echo ""
echo "Step 2: Applying config patch..."

# Step 2: Apply patch via gateway
RESPONSE=$(curl -s -X POST http://localhost:18789/api/config/patch \
    -H "Content-Type: application/json" \
    -d "$JSON_PATCH" 2>&1 || true)

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Config patch applied successfully!"
    echo ""
    echo "Step 3: Verifying gateway status..."
    openclaw gateway status | grep -E "(Gateway:|Listening:|Runtime:)"
else
    echo "❌ Config patch FAILED!"
    echo "Response: $RESPONSE"
    echo ""
    echo "RECOVERY INSTRUCTIONS:"
    echo "======================"
    echo "If the gateway is broken, restore from backup:"
    echo "  cp ~/.openclaw/backups/openclaw.json.*.$DESCRIPTION.backup ~/.openclaw/openclaw.json"
    echo "  openclaw gateway restart"
    exit 1
fi

echo ""
echo "✅ Safe patch complete!"
