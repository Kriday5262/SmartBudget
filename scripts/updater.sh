#!/usr/bin/env bash
# SmartBudget host updater.
#
# Run this from cron every minute on the machine that runs the Docker
# container. It does nothing until someone presses "Update now" in the app,
# which writes data/updater/request.json. Then it:
#   1. copies the whole data folder to $BACKUP_DIR (nothing is ever deleted),
#   2. fast-forwards the code to origin/$BRANCH (refuses if there are local edits),
#   3. builds the app and a new Docker image,
#   4. swaps the container, keeping the data folder mounted exactly as before,
#   5. waits for the health check, and rolls back to the old image if it fails.
# Progress goes to data/updater/status.json, which the app shows.
#
# Setup is automatic: ./start.sh (start, install, rebuild or restart) adds
# this script to cron if it isn't there yet. ./start.sh remove-updater turns
# it off.
#
# Set DRY_RUN=1 to print what it would do without changing anything.
set -euo pipefail

APP_DIR="${SMARTBUDGET_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DATA_DIR="${SMARTBUDGET_DATA_DIR:-$APP_DIR/data}"
UPDATER_DIR="$DATA_DIR/updater"
BACKUP_DIR="${SMARTBUDGET_BACKUP_DIR:-$APP_DIR/../smartbudget-backups}"
BRANCH="${SMARTBUDGET_UPDATE_BRANCH:-main}"
CONTAINER="smartbudget"
IMAGE="smartbudget"
PORT=9119
HEALTH_URL="http://127.0.0.1:$PORT/api/v1/health"
ENC_KEY_FILE="$BACKUP_DIR/encryption.key"
DRY_RUN="${DRY_RUN:-0}"

run() {
  if [ "$DRY_RUN" = "1" ]; then echo "[dry-run] $*"; else "$@"; fi
}

status() { # status <state> <message>
  local tmp="$UPDATER_DIR/status.json.tmp"
  printf '{"state":"%s","message":"%s","at":%s}\n' "$1" "${2//\"/\'}" "$(($(date +%s) * 1000))" >"$tmp"
  mv "$tmp" "$UPDATER_DIR/status.json"
  echo "$(date "+%Y-%m-%dT%H:%M:%S%z") [$1] $2"
}

mkdir -p "$UPDATER_DIR"
touch "$UPDATER_DIR/heartbeat" # tells the app the updater is installed

[ -f "$UPDATER_DIR/request.json" ] || exit 0

# Only one update at a time.
if command -v flock >/dev/null; then
  exec 9>"$UPDATER_DIR/.lock"
  flock -n 9 || exit 0
fi

mv "$UPDATER_DIR/request.json" "$UPDATER_DIR/request.processing.json"
trap 'rm -f "$UPDATER_DIR/request.processing.json"' EXIT
# Never leave the app showing "Updating…" forever if something unexpected fails.
trap 'status failed "Something went wrong during the update (details in updater.log). Your data is backed up in $BACKUP_DIR."' ERR
cd "$APP_DIR"

# Run as the user who owns the data dir, so files the app creates stay
# readable by this account (and by this cron backup tar).
container_args=(-d --name "$CONTAINER" --restart unless-stopped -p "$PORT:$PORT"
  --user "$(id -u):$(id -g)"
  -e DB_PATH=/data/budget.db -e DATA_DIR=/data -v "$DATA_DIR:/data")
if [ -f "$ENC_KEY_FILE" ]; then
  container_args+=(-e "SMARTBUDGET_ENC_KEY=$(cat "$ENC_KEY_FILE")")
fi

status updating "Backing up your data"
mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"
run tar -czf "$BACKUP_DIR/pre-update-$stamp.tar.gz" -C "$(dirname "$DATA_DIR")" --exclude=updater "$(basename "$DATA_DIR")"

status updating "Downloading the new version"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  status failed "The server's copy of the code has local changes, so it wasn't updated. Nothing was changed."
  exit 1
fi
old_commit="$(git rev-parse HEAD)"
run git fetch --quiet origin "$BRANCH"
if ! run git merge --ff-only --quiet "origin/$BRANCH"; then
  status failed "The new version couldn't be applied cleanly. Nothing was changed."
  exit 1
fi
new_commit="$(git rev-parse HEAD)"

status updating "Building the new version"
if ! (run npm ci --no-audit --no-fund &&
  run env SMARTBUDGET_COMMIT="$new_commit" NITRO_PRESET=node-server node_modules/.bin/vite build &&
  run docker build --quiet -t "$IMAGE:next" .); then
  run git reset --quiet --hard "$old_commit"
  status failed "The new version didn't build. The current version is still running."
  exit 1
fi

status updating "Restarting SmartBudget"
run docker tag "$IMAGE:latest" "$IMAGE:previous" 2>/dev/null || true
run docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
run docker run "${container_args[@]}" "$IMAGE:next" >/dev/null

healthy=0
for _ in $(seq 1 30); do
  if [ "$DRY_RUN" = "1" ] || curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" = "1" ]; then
  run docker tag "$IMAGE:next" "$IMAGE:latest"
  status done "Updated to ${new_commit:0:7}"
else
  trap - ERR
  run docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  run git reset --quiet --hard "$old_commit"
  if run docker run "${container_args[@]}" "$IMAGE:previous" >/dev/null; then
    status failed "The new version didn't start, so the previous version was restored. Your data wasn't changed."
  else
    status failed "The new version didn't start and the previous one couldn't be restarted. Run ./start.sh rebuild on the server. Your data wasn't changed."
  fi
  exit 1
fi
