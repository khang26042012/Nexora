#!/bin/bash
# Auto-export and upload player stats to catbox.moe
# Run ON THE SERVER: bash export_and_upload.sh [world_name]

WORLD_NAME="${1:-world}"
bash "$(dirname "$0")/export_stats.sh" "$WORLD_NAME"

if [ -f "player_stats_all.json" ]; then
  echo ""
  echo "📤 Uploading to catbox.moe..."
  URL=$(curl -s -F 'reqtype=fileupload' -F 'fileToUpload=@player_stats_all.json' https://catbox.moe/user/api.php)
  echo ""
  echo "✅ Upload complete!"
  echo "📎 URL: $URL"
  echo ""
  echo "Send this URL to the tool for analysis."
fi
