#!/bin/bash
# Brevo ↔ Shopify Subscriber Sync
# Syncs only email_marketing_consent.state=="subscribed" customers to Brevo list 3
# Run weekly via OpenClaw cron

source ~/.openclaw/.env 2>/dev/null

# 1. Fetch all Brevo emails from list 3
echo "Fetching Brevo contacts..."
> /tmp/brevo_emails.txt
OFFSET=0
while true; do
  RESP=$(curl -s -H "api-key: $BREVO_API_KEY_REST" "https://api.brevo.com/v3/contacts?limit=50&offset=$OFFSET&listIds=3")
  COUNT=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('contacts',[])))" 2>/dev/null)
  [ "$COUNT" = "0" ] && break
  echo "$RESP" | python3 -c "import sys,json; [print(c['email'].lower()) for c in json.load(sys.stdin).get('contacts',[])]" >> /tmp/brevo_emails.txt 2>/dev/null
  OFFSET=$((OFFSET + 50))
done
sort -u /tmp/brevo_emails.txt -o /tmp/brevo_emails.txt
BREVO_COUNT=$(wc -l < /tmp/brevo_emails.txt | tr -d ' ')

# 2. Fetch all Shopify customers with consent status
echo "Fetching Shopify customers..."
> /tmp/shopify_subscribed.txt
> /tmp/shopify_not_subscribed.txt
NEXT_URL="https://ecb34e-4.myshopify.com/admin/api/2024-01/customers.json?limit=250&fields=email,email_marketing_consent"

while [ -n "$NEXT_URL" ]; do
  RESP=$(curl -s -D /tmp/sh_hdr.txt -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" "$NEXT_URL")
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for c in d.get('customers', []):
    email = (c.get('email') or '').lower().strip()
    if not email: continue
    state = (c.get('email_marketing_consent') or {}).get('state', '')
    if state == 'subscribed':
        print(email, file=open('/tmp/shopify_subscribed.txt', 'a'))
    else:
        print(email, file=open('/tmp/shopify_not_subscribed.txt', 'a'))
" <<< "$RESP"
  NEXT_URL=$(python3 -c "
import re
with open('/tmp/sh_hdr.txt') as f:
    for line in f:
        if line.lower().startswith('link:'):
            m = re.search(r'<([^>]+)>;\s*rel=\"next\"', line)
            if m: print(m.group(1))
" 2>/dev/null)
done

sort -u /tmp/shopify_subscribed.txt -o /tmp/shopify_subscribed.txt
sort -u /tmp/shopify_not_subscribed.txt -o /tmp/shopify_not_subscribed.txt

# 3. Add new subscribers (in Shopify but not Brevo)
comm -23 /tmp/shopify_subscribed.txt /tmp/brevo_emails.txt > /tmp/to_add.txt
ADD_COUNT=$(wc -l < /tmp/to_add.txt | tr -d ' ')

if [ "$ADD_COUNT" -gt 0 ]; then
  echo "Adding $ADD_COUNT new subscribers..."
  python3 -c "
import json
with open('/tmp/to_add.txt') as f:
    emails = [l.strip() for l in f if l.strip()]
body = {'listIds': [3], 'updateExistingContacts': False, 'jsonBody': [{'email': e} for e in emails]}
with open('/tmp/brevo_add.json', 'w') as f:
    json.dump(body, f)
"
  curl -s -X POST "https://api.brevo.com/v3/contacts/import" \
    -H "api-key: $BREVO_API_KEY_REST" \
    -H "Content-Type: application/json" \
    -d @/tmp/brevo_add.json > /dev/null
fi

# 4. Remove unsubscribed (in Brevo but no longer subscribed in Shopify)
comm -12 /tmp/brevo_emails.txt /tmp/shopify_not_subscribed.txt > /tmp/to_remove.txt
REM_COUNT=$(wc -l < /tmp/to_remove.txt | tr -d ' ')

if [ "$REM_COUNT" -gt 0 ]; then
  echo "Removing $REM_COUNT unsubscribed contacts..."
  python3 << 'PYEOF'
import json, urllib.request, os
api_key = ""
with open(os.path.expanduser("~/.openclaw/.env")) as f:
    for line in f:
        if line.startswith("BREVO_API_KEY_REST="):
            api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
with open("/tmp/to_remove.txt") as f:
    emails = [l.strip() for l in f if l.strip()]
url = "https://api.brevo.com/v3/contacts/lists/3/contacts/remove"
headers = {"api-key": api_key, "Content-Type": "application/json"}
for i in range(0, len(emails), 150):
    chunk = emails[i:i+150]
    body = json.dumps({"emails": chunk}).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    urllib.request.urlopen(req)
PYEOF
fi

SUB_COUNT=$(wc -l < /tmp/shopify_subscribed.txt | tr -d ' ')
echo "SYNC COMPLETE | Shopify subscribed: $SUB_COUNT | Added: $ADD_COUNT | Removed: $REM_COUNT | Brevo before: $BREVO_COUNT"
