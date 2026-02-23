#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: bash scripts/create-webgame.sh <folder> <title> <tags>"
  echo "Example: bash scripts/create-webgame.sh webgame-10 \"Zigzag Rush\" \"Reflex · Zigzag\""
  exit 1
fi

FOLDER="$1"
TITLE="$2"
TAGS="$3"
TEMPLATE_DIR="templates/webgame-template"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "Template not found: $TEMPLATE_DIR"
  exit 1
fi

if [[ -e "$FOLDER" ]]; then
  echo "Target already exists: $FOLDER"
  exit 1
fi

cp -R "$TEMPLATE_DIR" "$FOLDER"

SAFE_KEY="$(echo "$FOLDER" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"

perl -pi -e "s/__GAME_TITLE__/$TITLE/g" "$FOLDER/index.html"
perl -pi -e "s/__LOCALSTORAGE_KEY__/$SAFE_KEY/g" "$FOLDER/game.js"

cat <<SNIPPET

Created: $FOLDER

Paste this card into /Users/user/TapTapCho/index.html (inside .grid):

<a class="card" href="./$FOLDER/index.html">
  <div class="thumb">
    <div class="thumb-title">$TITLE</div>
  </div>
  <div class="meta">
    <div class="title">$TITLE</div>
    <div class="tags">$TAGS</div>
  </div>
</a>

SNIPPET
