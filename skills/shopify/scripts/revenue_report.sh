#!/bin/bash
# Revenue report for Nylongerie Shopify store
# Usage: revenue_report.sh [days] [format]
#   days: lookback period (default: 30)
#   format: "text" or "json" (default: text)

set -euo pipefail
source ~/.openclaw/.env 2>/dev/null

DAYS="${1:-30}"
FORMAT="${2:-text}"
STORE="ecb34e-4.myshopify.com"
API_VER="2024-01"
BASE="https://$STORE/admin/api/$API_VER"
TMPFILE="/tmp/shopify_orders_$$.json"

# Calculate date range
if [[ "$OSTYPE" == "darwin"* ]]; then
  START=$(date -v-${DAYS}d +%Y-%m-%dT00:00:00%z)
else
  START=$(date -d "-${DAYS} days" +%Y-%m-%dT00:00:00%z)
fi

# Fetch orders (single page for now — handles up to 250 orders)
curl -s "$BASE/orders.json?status=any&created_at_min=$START&limit=250&financial_status=paid" \
  -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" > "$TMPFILE"

# Analyze
python3 << 'PYEOF'
import json, sys, os
from collections import defaultdict
from datetime import datetime

days = int(os.environ.get("DAYS", "30"))
fmt = os.environ.get("FORMAT", "text")
tmpfile = os.environ.get("TMPFILE", "/tmp/shopify_orders.json")

with open(tmpfile) as f:
    data = json.load(f)

orders = data.get("orders", [])

if not orders:
    if fmt == "json":
        print(json.dumps({"period_days": days, "total_orders": 0, "total_revenue": 0}))
    else:
        print(f"No paid orders in the last {days} days.")
    sys.exit(0)

total_rev = sum(float(o["total_price"]) for o in orders)
total_orders = len(orders)
avg_order = total_rev / total_orders

# Monthly
monthly = defaultdict(lambda: {"revenue": 0.0, "orders": 0})
for o in orders:
    month = o["created_at"][:7]
    monthly[month]["revenue"] += float(o["total_price"])
    monthly[month]["orders"] += 1

# Top products
product_sales = defaultdict(lambda: {"qty": 0, "revenue": 0.0})
for o in orders:
    for item in o.get("line_items", []):
        name = item["title"][:50]
        product_sales[name]["qty"] += item["quantity"]
        product_sales[name]["revenue"] += float(item["price"]) * item["quantity"]

top_products = sorted(product_sales.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]

# Discount usage
discount_usage = defaultdict(lambda: {"count": 0, "revenue": 0.0})
for o in orders:
    for dc in o.get("discount_codes", []):
        code = dc["code"]
        discount_usage[code]["count"] += 1
        discount_usage[code]["revenue"] += float(o["total_price"])

# Traffic sources
sources = defaultdict(int)
for o in orders:
    ref = o.get("referring_site", "") or ""
    landing = o.get("landing_site", "") or ""
    combined = (ref + " " + landing).lower()
    if "google" in combined:
        sources["Google"] += 1
    elif "instagram" in combined or "l.instagram" in combined or "IGShopping" in landing:
        sources["Instagram"] += 1
    elif "facebook" in combined or "fbclid" in combined:
        sources["Facebook"] += 1
    elif "shop.app" in combined:
        sources["Shop App"] += 1
    elif "bing" in combined:
        sources["Bing"] += 1
    elif "email" in combined or "syclid" in combined:
        sources["Email"] += 1
    elif not ref:
        sources["Direct"] += 1
    else:
        sources["Other"] += 1

# Customer geography
countries = defaultdict(int)
for o in orders:
    addr = o.get("shipping_address") or o.get("billing_address") or {}
    country = addr.get("country", "Unknown")
    countries[country] += 1

if fmt == "json":
    print(json.dumps({
        "period_days": days,
        "total_orders": total_orders,
        "total_revenue": round(total_rev, 2),
        "avg_order_value": round(avg_order, 2),
        "monthly": {k: {"revenue": round(v["revenue"],2), "orders": v["orders"]} for k,v in sorted(monthly.items())},
        "top_products": [{"name": n, "qty": d["qty"], "revenue": round(d["revenue"],2)} for n, d in top_products],
        "discount_codes": dict(discount_usage),
        "traffic_sources": dict(sources),
        "countries": dict(countries)
    }, indent=2))
else:
    print(f"📊 Nylongerie Revenue Report ({days} days)")
    print(f"═══════════════════════════════════════")
    print(f"Orders:      {total_orders}")
    print(f"Revenue:     €{total_rev:.2f}")
    print(f"Avg Order:   €{avg_order:.2f}")
    print()
    print("📅 Monthly Breakdown:")
    for m in sorted(monthly.keys()):
        d = monthly[m]
        print(f"  {m}: {d['orders']} orders, €{d['revenue']:.2f}")
    print()
    print("🏆 Top Products:")
    for name, data in top_products[:5]:
        print(f"  {name}: {data['qty']}x sold, €{data['revenue']:.2f}")
    print()
    if discount_usage:
        print("🏷️  Discount Codes Used:")
        for code, data in sorted(discount_usage.items(), key=lambda x: x[1]["count"], reverse=True):
            print(f"  {code}: {data['count']}x, €{data['revenue']:.2f} total")
        print()
    print("🔗 Traffic Sources:")
    for src, cnt in sorted(sources.items(), key=lambda x: x[1], reverse=True):
        print(f"  {src}: {cnt} orders")
    print()
    print("🌍 Customer Countries:")
    for country, cnt in sorted(countries.items(), key=lambda x: x[1], reverse=True):
        print(f"  {country}: {cnt}")
PYEOF

rm -f "$TMPFILE"
