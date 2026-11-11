#!/bin/bash
# SmartBudget production app (Docker, port 9119).
# Data lives in ./data (mounted into the container as /data).
# Encryption key lives OUTSIDE the data dir: ./../smartbudget-backups/encryption.key
#
#   ./start.sh            start the container
#   ./start.sh install    build and start (same as rebuild) — use for a new install
#   ./start.sh rebuild    build the app + image and replace the container
#   ./start.sh restart | stop | logs
#   ./start.sh remove-updater   turn off one-tap updates
#
# Starting, restarting or rebuilding also sets up the one-tap updater
# (scripts/updater.sh via cron) if it isn't already — nothing to do by hand.
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"
export DB_PATH="$APP_DIR/data/budget.db"
BACKUP_DIR="$(cd "$APP_DIR/.." && pwd)/smartbudget-backups"

# Real AES-256 key for at-rest encryption (falls back to the weak hostname
# derivation only when unset — deploy with the key file present).
ENC_KEY_FILE="$BACKUP_DIR/encryption.key"
ENC_KEY_ARGS=()
if [ -f "$ENC_KEY_FILE" ]; then
  ENC_KEY_ARGS=(-e "SMARTBUDGET_ENC_KEY=$(cat "$ENC_KEY_FILE")")
fi

UPDATER_MARK="# smartbudget-updater"

# Add the updater to this user's crontab (once). It runs every minute but does
# nothing until someone presses "Update now" in the app.
install_updater() {
  local updater="$APP_DIR/scripts/updater.sh"
  [ -f "$updater" ] || return 0
  chmod +x "$updater"
  mkdir -p "$BACKUP_DIR"
  if ! command -v crontab >/dev/null 2>&1; then
    echo "Note: cron isn't installed, so one-tap updates are off."
    echo "      Install it (for example: sudo apt install cron) and run ./start.sh again."
    return 0
  fi
  # Cron runs with a bare PATH; give the updater the same tools (git, npm, docker) as this shell.
  local line="* * * * * PATH='$PATH' '$updater' >> '$BACKUP_DIR/updater.log' 2>&1 $UPDATER_MARK"
  local current
  current="$(crontab -l 2>/dev/null || true)"
  if ! grep -qxF "$line" <<<"$current"; then
    { grep -vF "$UPDATER_MARK" <<<"$current" || true; echo "$line"; } | sed '/^$/d' | crontab -
    echo "Set up one-tap updates (Settings → Software update in the app)."
  fi
  # Let the app show updates as ready straight away (cron keeps this fresh).
  mkdir -p "$APP_DIR/data/updater" && touch "$APP_DIR/data/updater/heartbeat"
}

remove_updater() {
  if command -v crontab >/dev/null 2>&1; then
    # Read the whole crontab before writing it back, so other jobs are never lost.
    local current
    current="$(crontab -l 2>/dev/null || true)"
    { grep -vF "$UPDATER_MARK" <<<"$current" || true; } | sed '/^$/d' | crontab -
  fi
  rm -f "$APP_DIR/data/updater/heartbeat"
  echo "One-tap updates are off. Run ./start.sh again to turn them back on."
}

run_container() {
  # Run as the user who owns the data dir, so files the app creates stay
  # readable by this account (and by scripts/updater.sh's cron backup).
  docker run -d --name smartbudget --restart unless-stopped -p 9119:9119 \
    --user "$(id -u):$(id -g)" \
    -e DB_PATH=/data/budget.db -e DATA_DIR=/data "${ENC_KEY_ARGS[@]}" \
    -v "$APP_DIR/data:/data" smartbudget
}

case "$1" in
  stop)
    docker stop smartbudget
    ;;
  restart)
    docker restart smartbudget
    install_updater
    ;;
  logs)
    docker logs -f smartbudget
    ;;
  install | rebuild)
    NITRO_PRESET=node-server node_modules/.bin/vite build && docker build -t smartbudget . && docker rm -f smartbudget 2>/dev/null
    run_container
    install_updater
    ;;
  remove-updater)
    remove_updater
    ;;
  *)
    run_container
    install_updater
    ;;
esac
