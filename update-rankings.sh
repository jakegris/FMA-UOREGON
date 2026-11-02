#!/bin/bash
# ==============================================================================
# FMA MarketWatch Leaderboard Updater
# ==============================================================================
# Usage:
#   ./update-rankings.sh
#   (Automatically grabs the newest CSV from your ~/Downloads folder)
#
#   Or specify a file directly:
#   ./update-rankings.sh /path/to/downloaded_file.csv
# ==============================================================================

set -e

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DOWNLOADS_DIR="$HOME/Downloads"

TARGET_CSV="$1"

if [ -z "$TARGET_CSV" ]; then
    # Look for the most recently downloaded CSV in ~/Downloads
    LATEST_DOWNLOAD=$(find "$DOWNLOADS_DIR" -maxdepth 1 -name "*.csv" -type f -exec stat -f "%m %N" {} + 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2-)
    if [ -n "$LATEST_DOWNLOAD" ] && [ -f "$LATEST_DOWNLOAD" ]; then
        TARGET_CSV="$LATEST_DOWNLOAD"
    fi
fi

if [ -z "$TARGET_CSV" ] || [ ! -f "$TARGET_CSV" ]; then
    echo "Error: No CSV file found."
    echo "Please download the rankings from MarketWatch first, or pass the file path:"
    echo "  ./update-rankings.sh /path/to/download.csv"
    exit 1
fi

echo "Found rankings file: $TARGET_CSV"
cp "$TARGET_CSV" "$PROJECT_DIR/rankings.csv"
echo "Successfully updated rankings.csv in project folder."

# If Vercel CLI is available, deploy to production
if command -v vercel &> /dev/null; then
    echo "Deploying updated standings to Vercel..."
    cd "$PROJECT_DIR"
    vercel --prod --yes
    echo "Deploy complete! New standings are live on your website."
else
    echo "Next step: Deploy your changes to Vercel."
fi
