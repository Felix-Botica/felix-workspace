#!/usr/bin/env python3
"""
brevo-sync.py — THE ONLY WAY to sync Shopify contacts to Brevo.
Never manually import contacts. Always use this script.

What it does:
1. Fetches all Shopify customers with consent states
2. Fetches all Brevo contacts
3. Adds new subscribers to Brevo + list
4. Blacklists contacts that are no longer subscribed in Shopify
5. Removes blacklisted contacts from the mailing list
6. Outputs a verified report

Usage: python3 scripts/brevo-sync.py [--dry-run]
"""

import json, os, sys, urllib.request, urllib.parse, time
from datetime import datetime

DRY_RUN = '--dry-run' in sys.argv
LIST_ID = 3  # Nylongerie Subscribers (Botica.tech Brevo account)
SHOP = 'ecb34e-4.myshopify.com'


def load_env():
    env_path = os.path.expanduser('~/.openclaw/.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, _, val = line.partition('=')
                    os.environ.setdefault(key.strip(), val.strip())


def shopify_get_subscribers(token):
    """Fetch ALL customers, return dict email -> consent_state."""
    customers = {}
    url = f"https://{SHOP}/admin/api/2024-01/customers.json?limit=250"
    while url:
        req = urllib.request.Request(url, headers={"X-Shopify-Access-Token": token})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            link_header = resp.headers.get('Link', '')
        for c in data.get('customers', []):
            email = (c.get('email') or '').lower().strip()
            if not email:
                continue
            consent = c.get('email_marketing_consent') or {}
            customers[email] = consent.get('state', 'no_data')
        url = None
        if 'rel="next"' in link_header:
            for part in link_header.split(','):
                if 'rel="next"' in part:
                    url = part.split('<')[1].split('>')[0]
        time.sleep(0.5)
    return customers


def brevo_get_all(api_key):
    """Fetch all Brevo contacts, return dict email -> {blacklisted, list_ids}."""
    contacts = {}
    offset = 0
    while True:
        req = urllib.request.Request(
            f"https://api.brevo.com/v3/contacts?limit=50&offset={offset}",
            headers={"api-key": api_key}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        batch = data.get('contacts', [])
        if not batch:
            break
        for c in batch:
            email = (c.get('email') or '').lower().strip()
            contacts[email] = {
                'blacklisted': c.get('emailBlacklisted', False),
                'list_ids': c.get('listIds', []),
            }
        offset += 50
        if offset >= data.get('count', 0):
            break
        time.sleep(0.3)
    return contacts


def brevo_api(api_key, method, path, body=None):
    """Generic Brevo API call."""
    url = f"https://api.brevo.com/v3{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data,
        headers={"api-key": api_key, "Content-Type": "application/json"},
        method=method
    )
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status == 204:
                return {}
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ''
        return {'error': e.code, 'message': body_text}


def main():
    load_env()
    shopify_token = os.environ.get('SHOPIFY_ACCESS_TOKEN', '')
    brevo_key = os.environ.get('BREVO_API_KEY_REST', '')

    if not shopify_token or not brevo_key:
        print("ERROR: Missing SHOPIFY_ACCESS_TOKEN or BREVO_API_KEY_REST", file=sys.stderr)
        sys.exit(1)

    mode = "DRY RUN" if DRY_RUN else "LIVE"
    print(f"{'='*50}", file=sys.stderr)
    print(f"BREVO SYNC — {mode} — {datetime.now().isoformat()}", file=sys.stderr)
    print(f"{'='*50}", file=sys.stderr)

    # Step 1: Get truth from Shopify
    print("1/4 Fetching Shopify customers...", file=sys.stderr)
    shopify = shopify_get_subscribers(shopify_token)
    subscribed = {e for e, s in shopify.items() if s == 'subscribed'}
    not_subscribed = {e for e, s in shopify.items() if s != 'subscribed'}
    print(f"     Shopify: {len(shopify)} total, {len(subscribed)} subscribed", file=sys.stderr)

    # Step 2: Get current Brevo state
    print("2/4 Fetching Brevo contacts...", file=sys.stderr)
    brevo = brevo_get_all(brevo_key)
    print(f"     Brevo: {len(brevo)} total", file=sys.stderr)

    # Step 3: Calculate actions
    print("3/4 Calculating sync actions...", file=sys.stderr)

    # 3a: New subscribers to add to Brevo + list
    to_create = subscribed - set(brevo.keys())

    # 3b: Existing in Brevo, subscribed in Shopify, but blacklisted → DO NOT unblacklist
    # Brevo blacklists from bounces are authoritative — those addresses are dead.
    # Only unblacklist if we manually flagged them (not from bounces).
    # For safety: never auto-unblacklist. Log them as "shopify_subscribed_but_bounced".
    still_blacklisted = {e for e in subscribed & set(brevo.keys())
                         if brevo[e]['blacklisted']}
    to_unblacklist = set()  # NEVER auto-unblacklist — requires manual review

    # 3c: Existing in Brevo, subscribed, not in list → add to list
    to_add_to_list = {e for e in subscribed & set(brevo.keys())
                      if LIST_ID not in brevo[e]['list_ids'] and not brevo[e]['blacklisted']}

    # 3d: In Brevo, NOT subscribed in Shopify, not yet blacklisted → blacklist
    to_blacklist = {e for e in set(brevo.keys())
                    if e not in subscribed and not brevo[e]['blacklisted']}

    # 3e: In list but not subscribed → remove from list
    to_remove_from_list = {e for e in set(brevo.keys())
                           if e not in subscribed and LIST_ID in brevo[e].get('list_ids', [])}

    print(f"     New contacts to create: {len(to_create)}", file=sys.stderr)
    print(f"     To unblacklist (re-subscribed): {len(to_unblacklist)}", file=sys.stderr)
    print(f"     To add to list: {len(to_add_to_list)}", file=sys.stderr)
    print(f"     To blacklist: {len(to_blacklist)}", file=sys.stderr)
    print(f"     To remove from list: {len(to_remove_from_list)}", file=sys.stderr)

    if DRY_RUN:
        print("\n⚠️  DRY RUN — no changes made", file=sys.stderr)
        report = {
            'timestamp': datetime.now().isoformat(),
            'mode': 'dry_run',
            'shopify_subscribed': len(subscribed),
            'brevo_total': len(brevo),
            'actions': {
                'create': len(to_create),
                'unblacklist': len(to_unblacklist),
                'add_to_list': len(to_add_to_list),
                'blacklist': len(to_blacklist),
                'remove_from_list': len(to_remove_from_list),
            }
        }
        print(json.dumps(report, indent=2))
        return

    # Step 4: Execute
    print("4/4 Executing sync...", file=sys.stderr)
    results = {'created': 0, 'unblacklisted': 0, 'added_to_list': 0,
               'blacklisted': 0, 'removed_from_list': 0, 'errors': []}

    # 4a: Create new contacts
    for email in to_create:
        r = brevo_api(brevo_key, 'POST', '/contacts', {
            'email': email,
            'listIds': [LIST_ID],
            'updateEnabled': False
        })
        if 'error' in r:
            results['errors'].append(f"create {email}: {r}")
        else:
            results['created'] += 1
        time.sleep(0.2)

    # 4b: Unblacklist re-subscribed
    for email in to_unblacklist:
        encoded = urllib.parse.quote(email, safe='')
        r = brevo_api(brevo_key, 'PUT', f'/contacts/{encoded}', {
            'emailBlacklisted': False
        })
        if 'error' in r:
            results['errors'].append(f"unblacklist {email}: {r}")
        else:
            results['unblacklisted'] += 1
        time.sleep(0.2)

    # 4c: Add to list
    if to_add_to_list:
        r = brevo_api(brevo_key, 'POST', f'/contacts/lists/{LIST_ID}/contacts/add', {
            'emails': list(to_add_to_list)
        })
        if 'error' in r:
            results['errors'].append(f"add_to_list: {r}")
        else:
            results['added_to_list'] = len(to_add_to_list)

    # 4d: Blacklist non-subscribers
    for email in to_blacklist:
        encoded = urllib.parse.quote(email, safe='')
        r = brevo_api(brevo_key, 'PUT', f'/contacts/{encoded}', {
            'emailBlacklisted': True
        })
        if 'error' in r:
            results['errors'].append(f"blacklist {email}: {r}")
        else:
            results['blacklisted'] += 1
        time.sleep(0.2)

    # 4e: Remove from list
    if to_remove_from_list:
        r = brevo_api(brevo_key, 'POST', f'/contacts/lists/{LIST_ID}/contacts/remove', {
            'emails': list(to_remove_from_list)
        })
        if 'error' in r:
            results['errors'].append(f"remove_from_list: {r}")
        else:
            results['removed_from_list'] = len(to_remove_from_list)

    # Final verification
    print("\nVerifying...", file=sys.stderr)
    brevo_after = brevo_get_all(brevo_key)
    active_after = sum(1 for c in brevo_after.values() if not c['blacklisted'])
    in_list_after = sum(1 for c in brevo_after.values() if LIST_ID in c['list_ids'])
    deliverable = sum(1 for c in brevo_after.values()
                      if LIST_ID in c['list_ids'] and not c['blacklisted'])

    report = {
        'timestamp': datetime.now().isoformat(),
        'mode': 'live',
        'shopify_subscribed': len(subscribed),
        'brevo_total': len(brevo_after),
        'brevo_active': active_after,
        'brevo_list_total': in_list_after,
        'brevo_deliverable': deliverable,
        'match': abs(len(subscribed) - deliverable) <= 5,  # allow small delta
        'actions_taken': results,
        'delta': len(subscribed) - deliverable,
    }

    report['shopify_subscribed_but_bounced'] = len(still_blacklisted)

    status = "✅ SYNCED" if report['match'] else "⚠️ DELTA > 5"
    print(f"\n{status}", file=sys.stderr)
    print(f"  Shopify subscribed: {len(subscribed)}", file=sys.stderr)
    print(f"  Brevo deliverable:  {deliverable}", file=sys.stderr)
    print(f"  Delta: {report['delta']}", file=sys.stderr)
    if results['errors']:
        print(f"  Errors: {len(results['errors'])}", file=sys.stderr)

    print(json.dumps(report, indent=2))

    # Save log
    log_path = os.path.expanduser(
        f"~/.openclaw/workspace/memory/brevo-sync-{datetime.now().strftime('%Y-%m-%d')}.json"
    )
    with open(log_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\nLog: {log_path}", file=sys.stderr)


if __name__ == '__main__':
    main()
