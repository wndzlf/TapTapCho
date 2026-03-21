#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ $# -lt 3 ]]; then
  echo "Usage: bash meta/tools/create-webgame.sh <folder> <title> <tags>"
  echo "Example: bash meta/tools/create-webgame.sh zigzag-rush \"Zigzag Rush\" \"Reflex · Zigzag\""
  exit 1
fi

FOLDER="$1"
TITLE="$2"
TAGS="$3"
TEMPLATE_DIR="$ROOT_DIR/shared/templates/webgame-template"
TARGET_DIR="$ROOT_DIR/games/$FOLDER"
LEGACY_LINK="$ROOT_DIR/$FOLDER"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "Template not found: $TEMPLATE_DIR"
  exit 1
fi

if [[ -e "$TARGET_DIR" || -e "$LEGACY_LINK" ]]; then
  echo "Target already exists: $FOLDER"
  exit 1
fi

cp -R "$TEMPLATE_DIR" "$TARGET_DIR"
ln -s "games/$FOLDER" "$LEGACY_LINK"

SAFE_KEY="$(echo "$FOLDER" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"

perl -pi -e "s/__GAME_TITLE__/$TITLE/g" "$TARGET_DIR/index.html"
perl -pi -e "s/__LOCALSTORAGE_KEY__/$SAFE_KEY/g" "$TARGET_DIR/game.js"

cat <<SNIPPET

Created: games/$FOLDER
Legacy path: $FOLDER -> games/$FOLDER

Paste this card into $ROOT_DIR/index.html (inside .grid):

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
