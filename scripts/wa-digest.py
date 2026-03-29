#!/usr/bin/env python3
"""WhatsApp Inbox Digest v3 — Hybrid: Full extraction + Sonnet API analysis.
Called by wa-inbox-digest cron job. Does ALL work itself, outputs final digest.
Cron agent (Haiku) just sends the output.
"""

import json
import os
import re
import glob
import subprocess
from datetime import datetime, timedelta

SESSIONS_DIR = os.path.expanduser("~/.openclaw/agents/observer/sessions/")
PEOPLE_FILE = os.path.expanduser("~/.openclaw/workspace/memory/people.md")
LOOKBACK_HOURS = 36


def load_people():
    """Parse people.md to build phone→{name, tier} mapping.
    Two-pass: first collect all person blocks, then resolve tiers.
    Tier comes from **Tier:** line OR section header (## 🔴 Partnerin etc.)
    """
    people = {}
    entries = []  # (name, phone, explicit_tier)
    try:
        with open(PEOPLE_FILE) as f:
            current_section_tier = "Unknown"
            current_name = None
            current_tier = None
            current_phone = None
            
            for line in f:
                line_s = line.strip()
                
                # Section headers carry default tier
                if line_s.startswith("## "):
                    section = line_s[3:].strip()
                    # Extract tier emoji from section
                    for emoji in ["🔴", "🟠", "🟡", "🔵", "🟣", "⚪", "🟤"]:
                        if emoji in section:
                            current_section_tier = section
                            break
                
                if line_s.startswith("### "):
                    # Save previous person
                    if current_name and current_phone:
                        tier = current_tier or current_section_tier
                        phone_clean = re.sub(r'[^+\d]', '', current_phone)
                        people[phone_clean] = {"name": current_name, "tier": tier}
                    # Start new person
                    current_name = line_s[4:].strip()
                    current_tier = None
                    current_phone = None
                elif "**Tier:**" in line_s and current_name:
                    current_tier = line_s.split("**Tier:**")[1].strip()
                elif "**Phone:**" in line_s and current_name:
                    current_phone = line_s.split("**Phone:**")[1].strip()
            
            # Don't forget the last person
            if current_name and current_phone:
                tier = current_tier or current_section_tier
                phone_clean = re.sub(r'[^+\d]', '', current_phone)
                people[phone_clean] = {"name": current_name, "tier": tier}
                
    except FileNotFoundError:
        pass
    return people


def extract_chats():
    """Extract full chat conversations from observer session files."""
    cutoff = datetime.now().timestamp() - (LOOKBACK_HOURS * 3600)
    people = load_people()
    chats = {}

    all_files = glob.glob(os.path.join(SESSIONS_DIR, "*.jsonl"))
    today_str = datetime.now().strftime("%Y-%m-%d")
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    all_files += glob.glob(os.path.join(SESSIONS_DIR, f"*.reset.{today_str}*"))
    all_files += glob.glob(os.path.join(SESSIONS_DIR, f"*.reset.{yesterday_str}*"))

    for f in all_files:
        mtime = os.path.getmtime(f)
        if mtime < cutoff:
            continue

        sender_name = None
        sender_phone = None
        is_group = False
        group_subject = None
        messages = []
        has_audio = 0
        has_media = 0

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
                
                # CHANGED: Don't skip Lothar's messages anymore - we need context

                content = msg.get("content", [])
                for c in content:
                    if not isinstance(c, dict) or c.get("type") != "text":
                        continue
                    text = c["text"]
                    msg_sender = None
                    msg_ts = None

                    for ln in text.split("\n"):
                        ln = ln.strip().strip(",")
                        if '"sender":' in ln and '"sender_id"' not in ln:
                            name = ln.split('"sender":')[1].strip().strip('",')
                            if name:
                                msg_sender = name
                                # CHANGED: Track sender even if it's Lothar (for conversation partner identification)
                                if name != "Lothar Eckstein" and not sender_name:
                                    sender_name = name
                        if '"sender_id":' in ln and "+" in ln:
                            phone = ln.split('"sender_id":')[1].strip().strip('",')
                            sender_phone = phone
                        if '"is_group_chat":' in ln and "true" in ln.lower():
                            is_group = True
                        if '"group_subject":' in ln:
                            group_subject = ln.split('"group_subject":')[1].strip().strip('",')
                        if '"timestamp":' in ln:
                            msg_ts = ln.split('"timestamp":')[1].strip().strip('",')

                    msg_lines = []
                    in_json = False
                    for ln in text.split("\n"):
                        ln = ln.strip()
                        if ln.startswith("```"):
                            in_json = not in_json
                            continue
                        if in_json or not ln:
                            continue
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
                        if "<media:audio>" in ln:
                            has_audio += 1
                            msg_lines.append("[🎤 Sprachnachricht]")
                            continue
                        if "<media:" in ln or "[media attached:" in ln:
                            has_media += 1
                            msg_lines.append("[📎 Medien-Anhang]")
                            continue
                        if len(ln) > 2:
                            msg_lines.append(ln)

                    if msg_lines:
                        messages.append({
                            "sender": msg_sender or "Unknown",
                            "timestamp": msg_ts,
                            "text": "\n".join(msg_lines)
                        })

        if not sender_name and not group_subject:
            continue
        if len(messages) == 0 and has_audio == 0 and has_media == 0:
            continue

        phone_normalized = re.sub(r'[^+\d]', '', sender_phone) if sender_phone else None
        display_name = sender_name or "Unknown"
        tier = "Unknown"
        if phone_normalized and phone_normalized in people:
            display_name = people[phone_normalized]["name"]
            tier = people[phone_normalized]["tier"]

        chat_key = group_subject if (is_group and group_subject) else display_name

        if chat_key not in chats:
            chats[chat_key] = {
                "tier": tier, "is_group": is_group,
                "messages": [], "audio_count": 0, "media_count": 0
            }
        chats[chat_key]["messages"].extend(messages)
        chats[chat_key]["audio_count"] += has_audio
        chats[chat_key]["media_count"] += has_media

    return chats


def format_conversations(chats):
    """Format chats as structured text for LLM input."""
    if not chats:
        return None

    tier_order = {"🔴": 0, "🟠": 1, "🔵": 2, "🟣": 3, "🟡": 4, "⚪": 5, "🟤": 6}

    def sort_key(item):
        for emoji, order in tier_order.items():
            if emoji in item[1]["tier"]:
                return (order, -len(item[1]["messages"]))
        return (7, -len(item[1]["messages"]))

    lines = []
    for name, data in sorted(chats.items(), key=sort_key):
        prefix = "👥" if data["is_group"] else "💬"
        mc = len(data["messages"])
        lines.append(f"{prefix} {name} | Tier: {data['tier']} | {mc} msgs, {data['audio_count']} audio, {data['media_count']} media")
        for msg in data["messages"]:
            ts = ""
            if msg.get("timestamp"):
                m = re.search(r'(\d{1,2}:\d{2})', msg["timestamp"])
                if m:
                    ts = f" [{m.group(1)}]"
            lines.append(f"  {msg['sender']}{ts}: {msg['text']}")
        lines.append("")

    return "\n".join(lines)


def analyze_with_sonnet(conversations_text, chat_count, msg_count):
    """Call Anthropic Sonnet API directly for analysis."""
    import urllib.request

    # Load API key from env file
    api_key = None
    env_file = os.path.expanduser("~/.openclaw/.env")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.startswith("ANTHROPIC_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

    if not api_key:
        # Try environment
        api_key = os.environ.get("ANTHROPIC_API_KEY")

    if not api_key:
        # Fallback: use openclaw's token via CLI
        return fallback_format(conversations_text, chat_count, msg_count)

    prompt = f"""Analysiere diese WhatsApp-Gespräche und erstelle einen ACTIONABLE Digest auf Deutsch.

Du siehst VOLLSTÄNDIGE Gespräche (inkl. Lothars Antworten). Deine Aufgabe: Herausfiltern was WICHTIG ist.

FORMAT (genau so):

📬 **WhatsApp Digest — {datetime.now().strftime('%d.%m.%Y')}**
_{chat_count} Chats analysiert_

**⚡ Action Items**
→ [Konkrete Aktion] — [Warum/Kontext in 1 Zeile]

Nur aufführen wenn:
- Jemand wartet explizit auf Antwort (und Lothar hat noch nicht geantwortet)
- Zeitkritisches (Deadlines, Termine, Zusagen)
- Offene Fragen die Lothar ignoriert hat
- Wichtige Information die Reaktion braucht

**💡 Empfehlungen**
💡 [Was Lothar tun sollte] — [Begründung]

Nur wenn wirklich relevant:
- Basierend auf Tier-Priorität (🔴🟠 = wichtiger)
- Business-Chancen oder Risiken
- Beziehungs-Pflege wo nötig

**📋 Bemerkenswerte Gespräche**
[Tier-Emoji] **[Name]**
[1-2 Sätze: Was war wichtig/interessant? NUR wenn erwähnenswert]

FILTER-KRITERIEN:
✅ Zeige: Unbeantwortete Fragen, Konflikte, wichtige Updates, Business-Relevantes
❌ Skippe: Small Talk, bereits geklärte Dinge, belanglose Updates

REGELN:
- QUALITÄT > QUANTITÄT — Lieber 2 wichtige Items als 10 unwichtige
- Wenn nichts Action-würdig ist: "Keine dringenden Action Items"
- Konkret, nicht vage
- Deutsch
- Keine Floskeln
- **NIE Medien-Inhalte erraten. Nur faktisch: "hat ein Bild/Audio gesendet"**

GESPRÄCHE:
{conversations_text}"""

    payload = json.dumps({
        "model": "claude-3-haiku-20240307",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
    )

    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode())
                if data.get("content"):
                    return data["content"][0]["text"]
                return fallback_format(conversations_text, chat_count, msg_count)
        except urllib.error.HTTPError as e:
            if e.code in (429, 529) and attempt < max_retries - 1:
                import time
                wait = (attempt + 1) * 5  # 5s, 10s
                time.sleep(wait)
                continue
            return analyze_via_cli(conversations_text, chat_count, msg_count, str(e))
        except Exception as e:
            return analyze_via_cli(conversations_text, chat_count, msg_count, str(e))


def analyze_via_cli(conversations_text, chat_count, msg_count, error_hint=""):
    """Fallback: pipe through a simple claude CLI call if available."""
    # If direct API fails, return the raw formatted version
    return fallback_format(conversations_text, chat_count, msg_count, 
                          note=f"(LLM-Analyse nicht verfügbar: {error_hint[:80]})")


def fallback_format(conversations_text, chat_count, msg_count, note=""):
    """Basic formatting without LLM analysis."""
    header = f"📬 **WhatsApp Digest — {datetime.now().strftime('%d.%m.%Y')}**\n"
    header += f"_{chat_count} Chats, ~{msg_count} Nachrichten_\n"
    if note:
        header += f"\n⚠️ {note}\n"
    header += f"\n{conversations_text}"
    return header


def main():
    chats = extract_chats()
    if not chats:
        print("📬 Keine neuen WhatsApp-Nachrichten heute.")
        return

    chat_count = len(chats)
    msg_count = sum(len(c["messages"]) for c in chats.values())
    conversations_text = format_conversations(chats)

    if not conversations_text:
        print("📬 Keine neuen WhatsApp-Nachrichten heute.")
        return

    result = analyze_with_sonnet(conversations_text, chat_count, msg_count)
    print(result)


if __name__ == "__main__":
    main()
