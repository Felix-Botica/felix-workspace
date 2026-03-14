#!/usr/bin/env python3
"""WhatsApp Inbox Digest — reads Observer session files directly.
Called by the wa-inbox-digest cron job.
Outputs a formatted Telegram-ready summary.
"""

import json
import os
import glob
from datetime import datetime, timedelta

SESSIONS_DIR = os.path.expanduser("~/.openclaw/agents/observer/sessions/")
PEOPLE_FILE = os.path.expanduser("~/.openclaw/workspace/memory/people.md")
LOOKBACK_HOURS = 24


def load_people():
    """Parse people.md to build phone→name mapping."""
    people = {}
    try:
        with open(PEOPLE_FILE) as f:
            current_name = None
            for line in f:
                line = line.strip()
                if line.startswith("### "):
                    current_name = line[4:].strip()
                elif "**Phone:**" in line and current_name:
                    phone = line.split("**Phone:**")[1].strip()
                    people[phone] = current_name
    except FileNotFoundError:
        pass
    return people


def extract_chats():
    """Extract chat summaries from observer session files."""
    cutoff = datetime.now().timestamp() - (LOOKBACK_HOURS * 3600)
    people = load_people()
    chats = {}

    # Include both active .jsonl AND rotated .reset files from today
    all_files = glob.glob(os.path.join(SESSIONS_DIR, "*.jsonl"))
    today_str = datetime.now().strftime("%Y-%m-%d")
    all_files += glob.glob(os.path.join(SESSIONS_DIR, f"*.reset.{today_str}*"))
    
    for f in all_files:
        mtime = os.path.getmtime(f)
        if mtime < cutoff:
            continue

        basename = os.path.basename(f)
        
        sender_name = None
        sender_phone = None
        is_group = False
        group_subject = None
        msg_count = 0
        last_msgs = []
        has_audio = 0
        has_media = 0
        latest_ts = None

        with open(f) as fh:
            for line in fh:
                try:
                    d = json.loads(line.strip())
                except:
                    continue

                if d.get("type") != "message":
                    continue
                msg = d.get("message", {})
                if msg.get("role") != "user":
                    continue

                content = msg.get("content", [])
                for c in content:
                    if not isinstance(c, dict) or c.get("type") != "text":
                        continue
                    text = c["text"]

                    # Extract metadata
                    for ln in text.split("\n"):
                        ln = ln.strip().strip(",")
                        if '"sender":' in ln and '"sender_id"' not in ln:
                            name = ln.split('"sender":')[1].strip().strip('",')
                            if name and name != "Lothar Eckstein":
                                sender_name = name
                        if '"sender_id":' in ln and "+" in ln:
                            phone = ln.split('"sender_id":')[1].strip().strip('",')
                            sender_phone = phone
                        if '"is_group_chat":' in ln and "true" in ln.lower():
                            is_group = True
                        if '"group_subject":' in ln:
                            group_subject = ln.split('"group_subject":')[1].strip().strip('",')
                        if '"timestamp":' in ln:
                            ts_str = ln.split('"timestamp":')[1].strip().strip('",')
                            latest_ts = ts_str

                    # Extract actual message content
                    in_json = False
                    for ln in text.split("\n"):
                        ln = ln.strip()
                        if ln.startswith("```"):
                            in_json = not in_json
                            continue
                        if in_json or not ln:
                            continue

                        # Skip metadata lines
                        skip_keys = [
                            "conversation info", "untrusted metadata",
                            "message_id", "sender_id", "timestamp",
                            "group_subject", "is_group", "conversation_label",
                            "sender_label", '"sender":', '"name":',
                            '"username":', '"id":', '"label":',
                            "chat_type", "account_id", '"channel"',
                            "provider", "surface", "schema",
                            "is_forum", "topic_id", "chat_id",
                            "To send an image", "MEDIA:",
                            "Replied message", "Sender ("
                        ]
                        if any(k in ln for k in skip_keys):
                            continue
                        if ln.startswith("{") or ln.startswith("}") or ln.startswith("["):
                            continue

                        # Detect media types
                        if "<media:audio>" in ln:
                            has_audio += 1
                            continue
                        if "<media:" in ln or "[media attached:" in ln:
                            has_media += 1
                            continue

                        if len(ln) > 2:
                            msg_count += 1
                            last_msgs.append(ln[:150])

        if not sender_name and not group_subject:
            continue
        if msg_count == 0 and has_audio == 0 and has_media == 0:
            continue

        # Resolve name from people.md
        display_name = sender_name or "Unknown"
        if sender_phone and sender_phone in people:
            display_name = people[sender_phone]
        
        # Use group subject for group chats
        chat_key = group_subject if (is_group and group_subject) else display_name

        if chat_key not in chats:
            chats[chat_key] = {
                "count": 0,
                "audio": 0,
                "media": 0,
                "last_msgs": [],
                "is_group": is_group,
                "latest_ts": None
            }

        chats[chat_key]["count"] += msg_count
        chats[chat_key]["audio"] += has_audio
        chats[chat_key]["media"] += has_media
        chats[chat_key]["last_msgs"].extend(last_msgs[-3:])
        if latest_ts:
            chats[chat_key]["latest_ts"] = latest_ts

    return chats


def format_digest(chats):
    """Format chats into a Telegram-ready digest."""
    if not chats:
        return "📬 Keine neuen WhatsApp-Nachrichten heute."

    total_msgs = sum(c["count"] + c["audio"] + c["media"] for c in chats.values())
    
    lines = [
        f"📬 **WhatsApp Digest — {datetime.now().strftime('%d.%m.%Y')}**",
        f"_{len(chats)} Chats, ~{total_msgs} Nachrichten_",
        ""
    ]

    # Sort by message count descending
    for name, data in sorted(chats.items(), key=lambda x: -(x[1]["count"] + x[1]["audio"] + x[1]["media"])):
        total = data["count"] + data["audio"] + data["media"]
        prefix = "👥" if data["is_group"] else "💬"
        
        # Build count string
        parts = []
        if data["count"] > 0:
            parts.append(f"{data['count']} text")
        if data["audio"] > 0:
            parts.append(f"{data['audio']} 🎤")
        if data["media"] > 0:
            parts.append(f"{data['media']} 📎")
        count_str = ", ".join(parts)

        lines.append(f"{prefix} **{name}** ({count_str})")
        
        # Show last 1-2 messages as preview
        preview_msgs = data["last_msgs"][-2:]
        for m in preview_msgs:
            m_clean = m[:100]
            lines.append(f"   └ _{m_clean}_")
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    chats = extract_chats()
    print(format_digest(chats))
