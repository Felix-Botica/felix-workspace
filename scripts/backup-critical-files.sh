#!/bin/bash
# Backup Critical Files
# Backs up .env and openclaw.json before risky operations
# Usage: ./backup-critical-files.sh [operation_name]

set -euo pipefail

BACKUP_DIR="$HOME/.openclaw/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
OPERATION="${1:-manual}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Files to backup
FILES_TO_BACKUP=(
    "$HOME/.openclaw/.env"
    "$HOME/.openclaw/openclaw.json"
)

# Backup each file
for file in "${FILES_TO_BACKUP[@]}"; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        backup_file="$BACKUP_DIR/${filename}.${TIMESTAMP}.${OPERATION}.backup"
        cp "$file" "$backup_file"
        echo "✅ Backed up: $filename → ${filename}.${TIMESTAMP}.${OPERATION}.backup"
    else
        echo "⚠️  File not found: $file"
    fi
done

# Create recovery manifest
MANIFEST="$BACKUP_DIR/MANIFEST.${TIMESTAMP}.${OPERATION}.txt"
cat > "$MANIFEST" << EOF
Backup Manifest
===============
Timestamp: $TIMESTAMP
Operation: $OPERATION
Hostname: $(hostname)
User: $(whoami)

Files Backed Up:
$(for file in "${FILES_TO_BACKUP[@]}"; do
    if [[ -f "$file" ]]; then
        ls -lh "$file"
    fi
done)

Recovery Instructions:
======================
If you need to restore:

1. List backups:
   ls -lh $BACKUP_DIR

2. Restore a single file:
   cp $BACKUP_DIR/.env.TIMESTAMP.OPERATION.backup $HOME/.openclaw/.env

3. Restore all:
   cp $BACKUP_DIR/.env.${TIMESTAMP}.${OPERATION}.backup $HOME/.openclaw/.env
   cp $BACKUP_DIR/openclaw.json.${TIMESTAMP}.${OPERATION}.backup $HOME/.openclaw/openclaw.json
   openclaw gateway restart

4. After restore, verify:
   openclaw gateway status
   gog auth status
EOF

echo "📋 Manifest created: $MANIFEST"
echo ""
echo "✅ Backup complete for operation: $OPERATION"
echo "📁 Location: $BACKUP_DIR"
echo ""
echo "⏱️  Recent backups:"
ls -lht "$BACKUP_DIR" | head -5
