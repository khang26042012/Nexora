#!/bin/bash
# ═══════════════════════════════════════════════════════
# Export all player stats from Minecraft server
# Run this ON THE SERVER in the world folder
# Usage: bash export_stats.sh [world_name]
# Output: player_stats_all.json (upload to catbox or send directly)
# ═══════════════════════════════════════════════════════

WORLD_NAME="${1:-world}"
STATS_DIR="$WORLD_NAME/stats"
OUTPUT="player_stats_all.json"

if [ ! -d "$STATS_DIR" ]; then
  echo "❌ Stats directory not found: $STATS_DIR"
  echo "   Make sure you're in the server root and the world name is correct."
  echo "   Usage: bash export_stats.sh [world_name]"
  echo "   Example: bash export_stats.sh world"
  exit 1
fi

echo "📂 Reading stats from: $STATS_DIR"
echo "📝 Output file: $OUTPUT"

# Build JSON object with all player stats
echo '{' > "$OUTPUT"
FIRST=true
COUNT=0

for f in "$STATS_DIR"/*.json; do
  [ -f "$f" ] || continue
  UUID=$(basename "$f" .json)
  
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo ',' >> "$OUTPUT"
  fi
  
  # Embed the stats file content under the UUID key
  echo -n "  \"$UUID\": " >> "$OUTPUT"
  cat "$f" >> "$OUTPUT"
  COUNT=$((COUNT + 1))
done

echo '' >> "$OUTPUT"
echo '}' >> "$OUTPUT"

echo "✅ Exported $COUNT player stats to $OUTPUT"
echo "📦 File size: $(du -h "$OUTPUT" | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Upload to catbox: curl -F 'reqtype=fileupload' -F 'fileToUpload=@$OUTPUT' https://catbox.moe/user/api.php"
echo "  2. Or copy the file and send it directly"
