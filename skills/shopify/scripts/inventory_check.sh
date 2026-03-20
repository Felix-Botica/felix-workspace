#!/bin/bash
# Inventory check — finds low/out-of-stock active products
# Usage: inventory_check.sh [threshold]
#   threshold: units to flag as low stock (default: 3)

set -euo pipefail
source ~/.openclaw/.env 2>/dev/null

THRESHOLD="${1:-3}"
STORE="ecb34e-4.myshopify.com"
API_VER="2024-01"
BASE="https://$STORE/admin/api/$API_VER"

python3 -c "
import json, urllib.request, os

token = os.environ['SHOPIFY_ACCESS_TOKEN']
base = '$BASE'
threshold = $THRESHOLD

def fetch(url):
    req = urllib.request.Request(url, headers={
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# Paginate through all active products
products = []
url = f'{base}/products.json?limit=250&status=active&fields=id,title,variants,product_type'
while url:
    data = fetch(url)
    products.extend(data.get('products', []))
    # Simple pagination — no link header parsing in urllib
    if len(data.get('products', [])) == 250:
        last_id = data['products'][-1]['id']
        url = f'{base}/products.json?limit=250&status=active&fields=id,title,variants,product_type&since_id={last_id}'
    else:
        url = None

low_stock = []
out_of_stock = []

for p in products:
    for v in p.get('variants', []):
        qty = v.get('inventory_quantity', 0)
        item = {
            'title': p['title'][:60],
            'variant': v.get('title', 'Default'),
            'qty': qty,
            'price': v.get('price', '?'),
            'product_type': p.get('product_type', '')
        }
        if qty == 0:
            out_of_stock.append(item)
        elif qty <= threshold:
            low_stock.append(item)

print(f'📦 Inventory Check (threshold: ≤{threshold} units)')
print(f'═══════════════════════════════════════')
print(f'Active products scanned: {len(products)}')
print(f'Out of stock: {len(out_of_stock)}')
print(f'Low stock (≤{threshold}): {len(low_stock)}')
print()

if low_stock:
    print('⚠️  Low Stock:')
    for i in sorted(low_stock, key=lambda x: x['qty']):
        print(f'  [{i[\"qty\"]}] {i[\"title\"]} — €{i[\"price\"]}')
    print()

if out_of_stock and len(out_of_stock) <= 20:
    print('🔴 Out of Stock:')
    for i in out_of_stock:
        print(f'  {i[\"title\"]} — €{i[\"price\"]}')
elif out_of_stock:
    print(f'🔴 {len(out_of_stock)} products out of stock (too many to list)')
"
