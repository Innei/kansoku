#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRO_DIR="$APP_DIR/pro"

if [ -z "${KANSOKU_PRO_REPO_URL:-}" ]; then
  echo "fetch-pro: KANSOKU_PRO_REPO_URL is not set — nothing to fetch, staying in free mode" >&2
  exit 1
fi

if [ -d "$PRO_DIR/.git" ]; then
  echo "fetch-pro: app/pro already present, pulling latest"
  git -C "$PRO_DIR" pull --ff-only
else
  echo "fetch-pro: cloning $KANSOKU_PRO_REPO_URL into app/pro"
  git clone --depth 1 "$KANSOKU_PRO_REPO_URL" "$PRO_DIR"
fi
