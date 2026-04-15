#!/usr/bin/env python3
"""
Brevo ↔ Shopify Reconciliation Script
Compares contact consent states between Shopify (source of truth) and Brevo.
Run BEFORE imports and BEFORE campaigns.

Output: JSON report with discrepancies and recommended actions.
"""

import json, os, sys, urllib.request, time
from datetime import datetime

def shopify_get_all_customers(token, shop):
    """Fetch all customers with consent states from Shopify."""
    customers = {}
    url = f"https://{shop}/admin/api/2024-01/customers.json?limit=250&fields=id,email,email_marketing_consent"
    
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
            customers[email] = {
                'shopify_id': c['id'],
                'consent_state': consent.get('state', 'no_data'),
                'opt_in_level': consent.get('opt_in_level', 'unknown'),
            }
        
        url = None
        if 'rel="next"' in link_header:
            for part in link_header.split(','):
                if 'rel="next"' in part:
                    url = part.split('<')[1].split('>')[0]
        time.sleep(0.5)  # rate limit
    
    return customers


def brevo_get_all_contacts(api_key):
    """Fetch all contacts from Brevo."""
    contacts = {}
    offset = 0
    limit = 50
    
    while True:
        url = f"https://api.brevo.com/v3/contacts?limit={limit}&offset={offset}"
        req = urllib.request.Request(url, headers={"api-key": api_key})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        
        batch = data.get('contacts', [])
        if not batch:
            break
        
        for c in batch:
            email = (c.get('email') or '').lower().strip()
            contacts[email] = {
                'brevo_id': c.get('id'),
                'blacklisted': c.get('emailBlacklisted', False),
                'list_ids': c.get('listIds', []),
            }
        
        offset += limit
        if offset >= data.get('count', 0):
            break
        time.sleep(0.3)
    
    return contacts


def brevo_get_list_contacts(api_key, list_id):
    """Get all contact emails in a specific Brevo list."""
    emails = set()
    offset = 0
    limit = 50
    
    while True:
        url = f"https://api.brevo.com/v3/contacts/lists/{list_id}/contacts?limit={limit}&offset={offset}"
        req = urllib.request.Request(url, headers={"api-key": api_key})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        
        batch = data.get('contacts', [])
        if not batch:
            break
        
        for c in batch:
            emails.add((c.get('email') or '').lower().strip())
        
        offset += limit
        if offset >= data.get('count', 0):
            break
        time.sleep(0.3)
    
    return emails


def reconcile(shopify_customers, brevo_contacts, list_emails):
    """Compare and find discrepancies."""
    report = {
        'timestamp': datetime.now().isoformat(),
        'shopify_total': len(shopify_customers),
        'brevo_total': len(brevo_contacts),
        'brevo_list_count': len(list_emails),
        'shopify_consent_breakdown': {},
        'issues': [],
        'actions': [],
    }
    
    # Shopify consent breakdown
    for email, data in shopify_customers.items():
        state = data['consent_state']
        report['shopify_consent_breakdown'][state] = report['shopify_consent_breakdown'].get(state, 0) + 1
    
    # Issue 1: In Brevo but NOT subscribed in Shopify (exclude already blacklisted)
    should_not_be_in_brevo = []
    already_blacklisted = 0
    for email, brevo_data in brevo_contacts.items():
        if brevo_data.get('blacklisted'):
            already_blacklisted += 1
            continue  # already handled
        shopify_data = shopify_customers.get(email)
        if not shopify_data:
            should_not_be_in_brevo.append({'email': email, 'reason': 'not_in_shopify'})
        elif shopify_data['consent_state'] != 'subscribed':
            should_not_be_in_brevo.append({
                'email': email, 
                'reason': f"shopify_state={shopify_data['consent_state']}",
                'in_list': email in list_emails,
            })
    report['already_blacklisted'] = already_blacklisted
    
    # Issue 2: In Brevo mailing list but NOT subscribed in Shopify
    list_but_not_subscribed = []
    for email in list_emails:
        shopify_data = shopify_customers.get(email)
        if not shopify_data or shopify_data['consent_state'] != 'subscribed':
            list_but_not_subscribed.append({
                'email': email,
                'shopify_state': shopify_data['consent_state'] if shopify_data else 'not_in_shopify',
            })
    
    # Issue 3: Subscribed in Shopify but NOT in Brevo list
    subscribed_not_in_list = []
    for email, data in shopify_customers.items():
        if data['consent_state'] == 'subscribed' and email not in list_emails:
            subscribed_not_in_list.append(email)
    
    report['issues'] = {
        'in_brevo_not_subscribed_shopify': {
            'count': len(should_not_be_in_brevo),
            'contacts': should_not_be_in_brevo,
            'action': 'BLACKLIST or DELETE from Brevo',
        },
        'in_list_not_subscribed_shopify': {
            'count': len(list_but_not_subscribed),
            'contacts': list_but_not_subscribed,
            'action': 'REMOVE from mailing list immediately',
        },
        'subscribed_shopify_not_in_list': {
            'count': len(subscribed_not_in_list),
            'contacts': subscribed_not_in_list[:20],  # sample
            'action': 'ADD to mailing list (optional)',
        },
    }
    
    # Summary
    report['summary'] = {
        'clean': len(should_not_be_in_brevo) == 0 and len(list_but_not_subscribed) == 0,
        'contacts_to_remove_from_brevo': len(should_not_be_in_brevo),
        'contacts_to_remove_from_list': len(list_but_not_subscribed),
        'contacts_missing_from_list': len(subscribed_not_in_list),
    }
    
    return report


def main():
    # Load env
    env_path = os.path.expanduser('~/.openclaw/.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, _, val = line.partition('=')
                    os.environ.setdefault(key.strip(), val.strip())
    
    shopify_token = os.environ.get('SHOPIFY_ACCESS_TOKEN', '')
    brevo_key = os.environ.get('BREVO_API_KEY_REST', '')
    shop = 'ecb34e-4.myshopify.com'
    list_id = 9  # Nylongerie Subscribers
    
    if not shopify_token or not brevo_key:
        print("ERROR: Missing SHOPIFY_ACCESS_TOKEN or BREVO_API_KEY_REST", file=sys.stderr)
        sys.exit(1)
    
    print("Fetching Shopify customers...", file=sys.stderr)
    shopify = shopify_get_all_customers(shopify_token, shop)
    
    print("Fetching Brevo contacts...", file=sys.stderr)
    brevo = brevo_get_all_contacts(brevo_key)
    
    print(f"Fetching Brevo list {list_id} contacts...", file=sys.stderr)
    list_emails = brevo_get_list_contacts(brevo_key, list_id)
    
    print("Reconciling...", file=sys.stderr)
    report = reconcile(shopify, brevo, list_emails)
    
    # Output
    print(json.dumps(report, indent=2, default=str))
    
    # Summary to stderr
    s = report['summary']
    print(f"\n{'✅ CLEAN' if s['clean'] else '🚨 ISSUES FOUND'}", file=sys.stderr)
    print(f"  Contacts to remove from Brevo: {s['contacts_to_remove_from_brevo']}", file=sys.stderr)
    print(f"  Contacts to remove from list: {s['contacts_to_remove_from_list']}", file=sys.stderr)
    print(f"  Subscribed but missing from list: {s['contacts_missing_from_list']}", file=sys.stderr)


if __name__ == '__main__':
    main()
