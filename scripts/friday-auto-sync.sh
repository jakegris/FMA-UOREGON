#!/bin/bash
# ==============================================================================
# FMA Leaderboard - Friday 100% Background Automation
# Runs silently every Friday at 1:15 PM PT via macOS launchd
# ==============================================================================

set -e

PROJECT_DIR="/Users/jakegrissom/Desktop/FMA"
DOWNLOADS_DIR="$HOME/Downloads"
MW_DOWNLOAD_URL="https://www.marketwatch.com/games/fma-fall-2026-investment-game-/download?view=rankings&pub=&isDownload=true"
LOG_FILE="$PROJECT_DIR/auto-sync.log"

echo "[$(date)] Starting Friday automated leaderboard sync..." >> "$LOG_FILE"

# 1. Trigger background download via default browser (no windows steal focus)
open -g "$MW_DOWNLOAD_URL"
sleep 5

# 2. Find the newly downloaded CSV file in ~/Downloads
LATEST_CSV=$(find "$DOWNLOADS_DIR" -maxdepth 1 -name "*.csv" -type f -exec stat -f "%m %N" {} + 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2-)

if [ -n "$LATEST_CSV" ] && [ -f "$LATEST_CSV" ]; then
    echo "[$(date)] Found newly downloaded standings: $LATEST_CSV" >> "$LOG_FILE"
    
    # Copy to project as rankings.csv
    cp "$LATEST_CSV" "$PROJECT_DIR/rankings.csv"
    rm -f "$LATEST_CSV"
    
    cd "$PROJECT_DIR"
    
    # 3. Commit and push to GitHub (triggers live Vercel production deployment)
    git add rankings.csv index.html
    if git diff --staged --quiet; then
        echo "[$(date)] Standings are already up to date. No changes to commit." >> "$LOG_FILE"
    else
        git commit -m "chore(standings): weekly Friday automated update [skip ci]" >> "$LOG_FILE" 2>&1
        git push origin main >> "$LOG_FILE" 2>&1
        echo "[$(date)] Successfully pushed updated standings to live site!" >> "$LOG_FILE"
    fi
else
    echo "[$(date)] Warning: No downloaded CSV found in ~/Downloads." >> "$LOG_FILE"
fi
