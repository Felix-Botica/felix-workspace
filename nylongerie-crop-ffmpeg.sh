#!/bin/bash
set -euo pipefail

INBOX="$HOME/.openclaw/nylongerie/inbox"
WORKSPACE="$HOME/.openclaw/workspace/temp-crop"
mkdir -p "$WORKSPACE"

# Load .env
source "$HOME/.openclaw/.env"

# Read picks
PICKS=$(cat /tmp/picks.json)
COUNT=$(echo "$PICKS" | jq 'length')

for ((i=0; i<COUNT; i++)); do
  FILE=$(echo "$PICKS" | jq -r ".[$i].file")
  HANDLE=$(echo "$PICKS" | jq -r ".[$i].handle" | sed 's/@//')
  
  SRC="$INBOX/$FILE"
  if [ ! -f "$SRC" ]; then
    echo "❌ File not found: $FILE"
    continue
  fi
  
  # Crop to 4:5 (1080x1350) with center crop
  TEMP="$WORKSPACE/${FILE%.jpg}-crop.jpg"
  
  ffmpeg -y -i "$SRC" -vf "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350" -q:v 2 "$TEMP" 2>/dev/null
  
  # Upload to R2
  DATESTR=$(date +%Y%m%d)
  R2_KEY="preview/${DATESTR}-${HANDLE}-${FILE}"
  
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  aws s3 cp "$TEMP" "s3://$R2_BUCKET/$R2_KEY" \
    --endpoint-url "$R2_ENDPOINT" \
    --content-type "image/jpeg" \
    --acl public-read \
    2>/dev/null
  
  PREVIEW_URL="${R2_PUBLIC_URL}/${R2_KEY}"
  echo "✓ $FILE → $PREVIEW_URL"
  
  # Update picks JSON
  echo "$PICKS" | jq ".[$i].preview_url = \"$PREVIEW_URL\" | .[$i].r2_key = \"$R2_KEY\"" > /tmp/picks-temp.json
  PICKS=$(cat /tmp/picks-temp.json)
done

echo "$PICKS" > /tmp/picks-ready.json
echo ""
echo "✅ All images processed."
