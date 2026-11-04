#!/usr/bin/env bash
# Waits for the GitHub build of your latest commit, downloads that APK to Downloads,
# and checks that it really is this commit's app (not an older build).
# Usage:  bash ~/tuldok-app/tools/getapk.sh
REPO=akosidave31/tuldok
cd "$(dirname "$0")/.." || exit 1
SHA=$(git rev-parse HEAD)
echo "Waiting for the GitHub build of ${SHA:0:7} (checks every 15 s) ..."
while :; do
  J=$(curl -s "https://api.github.com/repos/$REPO/actions/runs?head_sha=$SHA&per_page=1")
  case "$J" in *"rate limit"*) echo; echo "GitHub says too many checks this hour. Wait a while, then run this again."; exit 1;; esac
  ST=$(printf '%s' "$J" | grep -m1 '"status"' | cut -d'"' -f4)
  CO=$(printf '%s' "$J" | grep -m1 '"conclusion"' | cut -d'"' -f4)
  NUM=$(printf '%s' "$J" | grep -m1 '"run_number"' | tr -dc '0-9')
  printf '\r%s  build %s: %-12s %s   ' "$(date +%H:%M:%S)" "${NUM:-?}" "${ST:-not started}" "$CO"
  [ "$ST" = completed ] && break
  sleep 15
done
echo
if [ "$CO" != success ]; then
  echo "The build failed. See why at https://github.com/$REPO/actions"
  echo "(open the run; the step 'Test the games in Chrome' lists any game errors). Paste it to Claude."
  exit 1
fi
OUT=~/storage/downloads/tuldok.apk
echo "Downloading build $NUM ..."
curl -fL --progress-bar -o "$OUT.part" "https://github.com/$REPO/releases/download/latest-build/tuldok.apk" || { echo "Download failed. Run this again."; exit 1; }
mv -f "$OUT.part" "$OUT"
A=$(unzip -p "$OUT" assets/index.html | sha256sum | cut -c1-16)
B=$(sha256sum app/src/main/assets/index.html | cut -c1-16)
if [ "$A" = "$B" ]; then
  echo "OK: $OUT is version 0.1.$NUM, built from ${SHA:0:7}."
  echo "Install it from the Files app: Downloads > tuldok.apk"
else
  echo "!! GitHub has not published this commit's APK yet. Wait a minute and run this again."
  exit 1
fi
