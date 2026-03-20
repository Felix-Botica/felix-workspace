---
name: shopify
description: Manage the Nylongerie Shopify store (ecb34e-4.myshopify.com). Use when working with products, orders, inventory, discount codes, flash sales, revenue analytics, or any e-commerce operations. Triggers on: product lookup, order status, create discount, flash sale, revenue report, inventory check, low stock, Shopify anything.
---

# Shopify Skill — Nylongerie Store

## Store Details
- **Store:** ecb34e-4.myshopify.com
- **API Version:** 2024-01
- **Auth:** `SHOPIFY_ACCESS_TOKEN` from `~/.openclaw/.env`
- **Scopes:** read_products, write_discounts, write_price_rules, read_orders, read_inventory

## Quick Reference

All API calls use:
```bash
source ~/.openclaw/.env
curl -s "https://ecb34e-4.myshopify.com/admin/api/2024-01/{endpoint}" \
  -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN"
```

For POST/PUT, add `-H "Content-Type: application/json" -d '{...}'`.

## Core Operations

### Products
```bash
# List (paginated, max 250)
GET /products.json?limit=250&fields=id,title,variants,tags,status

# Search by title
GET /products.json?title=shiny+tights

# Count
GET /products/count.json

# Single product
GET /products/{id}.json
```

**Key fields:** `title`, `status` (active/draft/archived), `product_type`, `tags`, `variants[].price`, `variants[].inventory_quantity`, `variants[].sku`

### Orders
```bash
# Recent orders
GET /orders.json?status=any&limit=50&order=created_at+desc

# Date range
GET /orders.json?status=any&created_at_min=2026-01-01&created_at_max=2026-01-31

# With financial status filter
GET /orders.json?financial_status=paid&limit=250
```

**Key fields:** `total_price`, `currency`, `financial_status`, `created_at`, `discount_codes[]`, `referring_site`, `landing_site`, `line_items[]`, `customer`

### Discount Codes (Flash Sales)

Create a price rule, then attach a discount code:

```bash
# 1. Create price rule
POST /price_rules.json
{
  "price_rule": {
    "title": "FLASH20",
    "target_type": "line_item",
    "target_selection": "all",
    "allocation_method": "across",
    "value_type": "percentage",
    "value": "-20.0",
    "customer_selection": "all",
    "starts_at": "2026-03-19T10:00:00+01:00",
    "ends_at": "2026-03-20T10:00:00+01:00",
    "usage_limit": null
  }
}

# 2. Create discount code for the rule
POST /price_rules/{price_rule_id}/discount_codes.json
{
  "discount_code": {
    "code": "FLASH20"
  }
}

# List existing rules
GET /price_rules.json

# Delete expired rule
DELETE /price_rules/{id}.json
```

### Inventory
```bash
# Inventory levels by location
GET /inventory_levels.json?inventory_item_ids={ids}

# Product inventory is on variants: variants[].inventory_quantity
```

## Analytics Script

For revenue reports, use the analytics script:
```bash
bash scripts/revenue_report.sh [days]  # default: 30
```

## Workflow: Instagram Flash Sale

1. Create discount code (20-30% off, 24-48h expiry)
2. Generate Instagram caption mentioning the code
3. Post via Nylongerie pipeline with "LINK IN BIO" CTA
4. Track: after expiry, check orders with that discount code
5. Report results

## Workflow: Low Stock Alert

Run `scripts/inventory_check.sh` — alerts when products have ≤3 units.
Integrate with daily health check or heartbeat.

## Workflow: Weekly Revenue Report

Run `scripts/revenue_report.sh 7` for last 7 days.
Include in evening digest or send to Digest topic.

## Store Context
- **315 products** (hosiery/nylons/tights)
- **Avg order:** ~€42
- **Current revenue:** ~€200/month (4-6 orders)
- **Target:** €5,000/month
- **42 existing price rules** (many expired — clean up periodically)
- **Traffic source:** Primarily Google organic + Instagram
- **Inventory:** Mix of stocked + high-quantity items (likely dropship)

## Limitations
- No write_products scope — cannot create/edit products
- No write_orders scope — cannot modify orders
- Can only read products/orders/inventory and manage discounts
- Rate limit: 2 requests/second (bucket with 40 request leak)

## Reference Files
- `references/api-endpoints.md` — Full endpoint reference with all parameters
- `scripts/revenue_report.sh` — Revenue analytics by period
- `scripts/inventory_check.sh` — Low stock detection
- `scripts/discount_manager.sh` — Create/list/cleanup discount codes
