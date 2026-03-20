# Shopify Admin API — Endpoint Reference

Store: `ecb34e-4.myshopify.com` | API: `2024-01`

## Products (read-only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/products.json?limit=250` | GET | List products (max 250/page) |
| `/products/{id}.json` | GET | Single product |
| `/products/count.json` | GET | Total product count |
| `/products.json?title=keyword` | GET | Search by title |
| `/products.json?product_type=nylons` | GET | Filter by type |
| `/products.json?status=active` | GET | Filter by status |
| `/products.json?collection_id={id}` | GET | Products in collection |

**Pagination:** Use `since_id` parameter with last product ID from previous page.

**Useful field filters:** `?fields=id,title,variants,tags,status,product_type,images`

## Orders (read-only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/orders.json?status=any&limit=250` | GET | List orders |
| `/orders/{id}.json` | GET | Single order |
| `/orders/count.json?status=any` | GET | Total order count |

**Key filters:**
- `created_at_min`, `created_at_max` — Date range (ISO 8601)
- `financial_status` — paid, pending, refunded, voided
- `fulfillment_status` — shipped, partial, unshipped, unfulfilled
- `status` — open, closed, cancelled, any

**Order contains:**
- `line_items[]` — products purchased (title, quantity, price, variant_id)
- `discount_codes[]` — codes used ({code, amount, type})
- `referring_site` — traffic source URL
- `landing_site` — first page visited
- `customer` — buyer info (email, name, orders_count)
- `shipping_address` — delivery address with country

## Price Rules & Discount Codes (read/write)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/price_rules.json` | GET | List all price rules |
| `/price_rules.json` | POST | Create price rule |
| `/price_rules/{id}.json` | GET | Single rule |
| `/price_rules/{id}.json` | PUT | Update rule |
| `/price_rules/{id}.json` | DELETE | Delete rule |
| `/price_rules/{id}/discount_codes.json` | GET | List codes for rule |
| `/price_rules/{id}/discount_codes.json` | POST | Create code |

**Price rule body:**
```json
{
  "price_rule": {
    "title": "CODE_NAME",
    "target_type": "line_item",
    "target_selection": "all",
    "allocation_method": "across",
    "value_type": "percentage",
    "value": "-20.0",
    "customer_selection": "all",
    "starts_at": "ISO_DATE",
    "ends_at": "ISO_DATE",
    "usage_limit": null,
    "once_per_customer": false
  }
}
```

**Value types:** `percentage` (value: "-20.0") or `fixed_amount` (value: "-5.00")
**Target selection:** `all` (entire order) or `entitled` (specific products/collections)

## Inventory (read-only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/inventory_levels.json?inventory_item_ids=x,y` | GET | Stock levels |
| `/inventory_items/{id}.json` | GET | Single inventory item |

**Note:** Inventory quantity is also available on `product.variants[].inventory_quantity`.

## Collections (read-only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/custom_collections.json` | GET | Manual collections |
| `/smart_collections.json` | GET | Auto collections |
| `/collections/{id}/products.json` | GET | Products in collection |

## Rate Limits
- **Bucket:** 40 requests, leaks 2/second
- **Response headers:** `X-Shopify-Shop-Api-Call-Limit: 1/40`
- **On 429:** Wait and retry (respect `Retry-After` header)
- **Best practice:** Add 0.5s delay between burst requests
