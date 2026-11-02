#!/bin/bash
# ==============================================================================
# FMA MarketWatch Leaderboard Updater
# ==============================================================================
# 1. Opens the MarketWatch direct download link in your browser
# 2. Automatically picks up the newest download.csv from ~/Downloads
# 3. Copies it to rankings.csv in your project
# 4. Commits and pushes to GitHub (triggering automatic Vercel production deploy)
# ==============================================================================

set -e

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DOWNLOADS_DIR="$HOME/Downloads"
MW_DOWNLOAD_URL="https://www.marketwatch.com/games/fma-fall-2026-investment-game-/download?view=rankings&pub=&isDownload=true"

echo "=================================================="
echo "    FMA Leaderboard Automatic Updater             "
echo "=================================================="

# Check if user passed a file argument
TARGET_CSV="$1"

if [ -z "$TARGET_CSV" ]; then
    echo "1. Triggering MarketWatch download in your browser..."
    open "$MW_DOWNLOAD_URL"
    echo "Waiting 4 seconds for browser download to finish..."
    sleep 4

    # Find the newest CSV in ~/Downloads
    LATEST_DOWNLOAD=$(find "$DOWNLOADS_DIR" -maxdepth 1 -name "*.csv" -type f -exec stat -f "%m %N" {} + 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2-)
    if [ -n "$LATEST_DOWNLOAD" ] && [ -f "$LATEST_DOWNLOAD" ]; then
        TARGET_CSV="$LATEST_DOWNLOAD"
    fi
fi

if [ -z "$TARGET_CSV" ] || [ ! -f "$TARGET_CSV" ]; then
    echo "Error: No CSV file found in ~/Downloads."
    echo "Please download the rankings from MarketWatch first, or pass the file path:"
    echo "  ./update-rankings.sh /path/to/download.csv"
    exit 1
fi

echo "2. Found rankings file: $TARGET_CSV"
cp "$TARGET_CSV" "$PROJECT_DIR/rankings.csv"
echo "Successfully updated rankings.csv in project folder."

cd "$PROJECT_DIR"

# Stage and commit to Git
git add rankings.csv index.html
if git diff --staged --quiet; then
    echo "No changes detected — standings are already up to date!"
else
    git commit -m "chore(standings): update weekly MarketWatch standings"
    echo "3. Committed updated standings to local Git."
    echo "4. Pushing to GitHub (origin main)..."
    if git push origin main 2>/dev/null; then
        echo "Successfully pushed to GitHub! Vercel is now deploying your live standings."
    else
        echo "Tip: Run 'git push' in your terminal or sync via GitHub to deploy live."
    fi
fi

echo "=================================================="
echo "Done! Leaderboard update complete."
echo "=================================================="
