# HEARTBEAT.md — Periodic Tasks

# Morning Briefing (07:30 CET daily)
# Send Lothar a WhatsApp summary:
# - Unread emails (categorized: actionable vs newsletters/promos)
# - Today's calendar events with any conflicts flagged
# - Any pending approvals or decisions needed
# - Weather in current location if known

# Email Check (every 2 hours during business hours)
# - Flag anything urgent from known business contacts
# - Nudge Lothar if something has been waiting >4 hours

# Calendar Conflict Check (every evening)
# - Look at tomorrow's schedule
# - Flag any overlapping events or back-to-back meetings with no buffer

# WhatsApp Session Health (daily)
# - Verify WhatsApp connection is still active
# - If disconnected, alert Lothar immediately
# - WhatsApp sessions expire after ~14 days — warn 2 days before

# 🔴 Integration Health Check (daily)
# NO SILENT FAILS. If any integration is broken → alert Lothar in Health topic IMMEDIATELY.
# Check:
# - Withings: tokens non-empty in .env + test API call (v2/sleep getsummary)
# - Gmail/gog: `gog auth status` returns valid
# - WhatsApp: connection alive
# - Shopify: token present
# If ANY check fails → message Lothar with what's broken and how to fix it.
# Never wait for him to discover it himself.

# Google Cloud Trial Monitor (check weekly)
# - Trial had ~€258 credit as of Feb 25, 2026
# - Warn Lothar when credit drops below €50 or 5 days remain
# - Losing this means Gmail and Calendar APIs stop working
