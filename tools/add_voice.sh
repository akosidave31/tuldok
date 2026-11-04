#!/usr/bin/env bash
# Puts the newest tuldok-voice*.zip from Downloads into the app, pushes it, and fetches the new APK.
# Usage:  bash ~/tuldok-app/tools/add_voice.sh
cd "$(dirname "$0")/.." || exit 1
ZIP=$(ls -t ~/storage/downloads/tuldok-voice*.zip 2>/dev/null | head -1)
if [ -z "$ZIP" ]; then echo "No tuldok-voice*.zip in Downloads. Download it from Colab or Google Drive first."; exit 1; fi
echo "Using: $ZIP"
rm -rf app/src/main/assets/voice
unzip -oq "$ZIP" -d app/src/main/assets/ || exit 1
echo "Voice files in the app: $(ls app/src/main/assets/voice | wc -l)"
git add -A
git commit -q -m "Update voice clips" || echo "(no change to commit)"
git push && bash tools/getapk.sh
