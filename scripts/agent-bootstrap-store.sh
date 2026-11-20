#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
ROOT="$(cd "$ROOT" && pwd)"
STORE_DIR="$ROOT/store"
ASSETS_DIR="$STORE_DIR/assets"
MANIFEST="$STORE_DIR/design-manifest.json"
PROMPT="$STORE_DIR/generate-store-from-design.md"

mkdir -p "$ASSETS_DIR"

if [[ ! -e "$MANIFEST" ]]; then
  cp "$ROOT/examples/design-manifest.json" "$MANIFEST"
  echo "created $MANIFEST"
else
  echo "kept existing $MANIFEST"
fi

if [[ ! -e "$PROMPT" ]]; then
  cp "$ROOT/examples/prompts/generate-store-from-design.md" "$PROMPT"
  echo "created $PROMPT"
else
  echo "kept existing $PROMPT"
fi

cat <<EOF

StoreForge agent workspace ready:
  repository: $ROOT
  assets:     $ASSETS_DIR
  manifest:   $MANIFEST
  prompt:     $PROMPT

Next steps:
  1. Put logos, screenshots, moodboards, and product images in $ASSETS_DIR.
  2. Update $MANIFEST so its asset paths point to those files.
  3. Start the MCP server with:
     STOREFORGE_ROOT="$ROOT" pnpm mcp:start
  4. Give the agent $PROMPT and ask it to follow the MCP tool sequence.
EOF
