#!/bin/bash
# Discount code manager — create, list, cleanup
# Usage:
#   discount_manager.sh create <CODE> <percentage> <hours>
#   discount_manager.sh list
#   discount_manager.sh cleanup  (removes expired rules)

set -euo pipefail
source ~/.openclaw/.env 2>/dev/null

STORE="ecb34e-4.myshopify.com"
API_VER="2024-01"
BASE="https://$STORE/admin/api/$API_VER"
ACTION="${1:-list}"

api() {
  local method="$1" endpoint="$2" data="${3:-}"
  if [ -n "$data" ]; then
    curl -s -X "$method" "$BASE/$endpoint" \
      -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "$BASE/$endpoint" \
      -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN"
  fi
}

case "$ACTION" in
  create)
    CODE="${2:?Usage: discount_manager.sh create CODE percentage hours}"
    PCT="${3:?Percentage required (e.g. 20)}"
    HOURS="${4:?Duration in hours required (e.g. 24)}"
    
    # Calculate start/end
    START=$(date -u +%Y-%m-%dT%H:%M:%S+00:00)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      END=$(date -u -v+${HOURS}H +%Y-%m-%dT%H:%M:%S+00:00)
    else
      END=$(date -u -d "+${HOURS} hours" +%Y-%m-%dT%H:%M:%S+00:00)
    fi
    
    echo "Creating discount: $CODE (-${PCT}%, valid for ${HOURS}h)..."
    
    # Create price rule
    RULE=$(api POST "price_rules.json" "{
      \"price_rule\": {
        \"title\": \"$CODE\",
        \"target_type\": \"line_item\",
        \"target_selection\": \"all\",
        \"allocation_method\": \"across\",
        \"value_type\": \"percentage\",
        \"value\": \"-${PCT}.0\",
        \"customer_selection\": \"all\",
        \"starts_at\": \"$START\",
        \"ends_at\": \"$END\"
      }
    }")
    
    RULE_ID=$(echo "$RULE" | python3 -c "import sys,json; print(json.load(sys.stdin)['price_rule']['id'])" 2>/dev/null)
    
    if [ -z "$RULE_ID" ]; then
      echo "❌ Failed to create price rule:"
      echo "$RULE"
      exit 1
    fi
    
    # Create discount code
    DC=$(api POST "price_rules/$RULE_ID/discount_codes.json" "{
      \"discount_code\": {\"code\": \"$CODE\"}
    }")
    
    echo "✅ Created: $CODE"
    echo "   Discount: ${PCT}% off everything"
    echo "   Valid: $START → $END"
    echo "   Rule ID: $RULE_ID"
    echo "   Share: Use code $CODE at nylongerie.com checkout"
    ;;
    
  list)
    echo "🏷️  Active Discount Codes"
    echo "═══════════════════════════════════════"
    api GET "price_rules.json" | python3 -c "
import sys, json
from datetime import datetime, timezone

rules = json.load(sys.stdin).get('price_rules', [])
now = datetime.now(timezone.utc)
active = []
expired = []

for r in rules:
    ends = r.get('ends_at')
    if ends:
        end_dt = datetime.fromisoformat(ends.replace('Z', '+00:00'))
        if end_dt < now:
            expired.append(r)
            continue
    active.append(r)

print(f'Active: {len(active)} | Expired: {len(expired)}')
print()
for r in sorted(active, key=lambda x: x.get('starts_at', '') or ''):
    ends = r.get('ends_at') or 'never'
    if ends != 'never':
        ends = ends[:16].replace('T', ' ')
    print(f'  {r[\"title\"]}: {r[\"value\"]}% | ends: {ends} | usage: {r.get(\"usage_count\", 0)}x')
"
    ;;
    
  cleanup)
    echo "🧹 Cleaning up expired discount codes..."
    api GET "price_rules.json" | python3 -c "
import sys, json
from datetime import datetime, timezone

rules = json.load(sys.stdin).get('price_rules', [])
now = datetime.now(timezone.utc)
expired = []

for r in rules:
    ends = r.get('ends_at')
    if ends:
        end_dt = datetime.fromisoformat(ends.replace('Z', '+00:00'))
        if end_dt < now:
            expired.append(r)

print(f'Found {len(expired)} expired rules to clean up')
for r in expired:
    print(f'  Deleting: {r[\"title\"]} (expired {r[\"ends_at\"][:10]})')
# Output IDs for deletion
with open('/tmp/shopify_cleanup_ids.txt', 'w') as f:
    for r in expired:
        f.write(str(r['id']) + '\n')
print(f'IDs written to /tmp/shopify_cleanup_ids.txt')
print('Run: while read id; do curl -s -X DELETE \"$BASE/price_rules/\$id.json\" -H \"X-Shopify-Access-Token: \$SHOPIFY_ACCESS_TOKEN\"; done < /tmp/shopify_cleanup_ids.txt')
"
    ;;
    
  *)
    echo "Usage: discount_manager.sh {create|list|cleanup}"
    echo "  create CODE percentage hours  — Create a time-limited discount"
    echo "  list                          — List active discount codes"
    echo "  cleanup                       — Find and remove expired rules"
    ;;
esac
