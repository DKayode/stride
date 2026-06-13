#!/usr/bin/env bash
#
# Stride VPS-side deploy: pull the new image, restart the container, prune old
# images, and verify the container is healthy. Invoked by the CD workflow over
# SSH (.github/workflows/deploy.yml) and also runnable by hand on the VPS:
#
#   cd /opt/stride && ./scripts/deploy.sh
#
# Idempotent and safe to re-run. Pulls first, THEN `up -d`, so the site is only
# briefly recreated, not down while the image downloads.
#
# Environment (all optional; sensible defaults):
#   STRIDE_DIR   deploy dir holding docker-compose.yml   (default /opt/stride)
#   IMAGE        image repo (no tag)                       (default ghcr.io/dkayode/stride)
#   IMAGE_SHA    full :sha-<short> ref, informational/logging
#   GHCR_USER    GHCR username for login                  (required iff GHCR_PAT set)
#   GHCR_PAT     read:packages PAT; if set, logs in to GHCR (private package)
#   SKIP_PULL    set to 1 to redeploy the already-present image (manual/offline)
#   HEALTH_TIMEOUT  seconds to wait for healthy            (default 90)
set -euo pipefail

STRIDE_DIR="${STRIDE_DIR:-/opt/stride}"
IMAGE="${IMAGE:-ghcr.io/dkayode/stride}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SERVICE="stride"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

cd "$STRIDE_DIR" || die "deploy dir not found: $STRIDE_DIR"
[ -f "$COMPOSE_FILE" ] || die "compose file not found: $STRIDE_DIR/$COMPOSE_FILE"

# Resolve the compose command (v2 plugin preferred, legacy fallback).
if docker compose version >/dev/null 2>&1; then
  dc() { docker compose -f "$COMPOSE_FILE" "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  dc() { docker-compose -f "$COMPOSE_FILE" "$@"; }
else
  die "neither 'docker compose' nor 'docker-compose' is available"
fi

# 1. Optional GHCR login — only when a PAT is provided (private package). For a
#    public package or a VPS already logged in via vps-setup, this is skipped.
if [ -n "${GHCR_PAT:-}" ]; then
  [ -n "${GHCR_USER:-}" ] || die "GHCR_USER is required when GHCR_PAT is set"
  log "Logging in to ghcr.io as ${GHCR_USER}"
  printf '%s' "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
else
  log "No GHCR_PAT set — assuming public package or pre-existing docker login"
fi

# 2. Pull the freshly built :latest (compose pins ${IMAGE}:latest).
if [ "${SKIP_PULL:-0}" = "1" ]; then
  log "SKIP_PULL=1 — using the image already present locally"
else
  log "Pulling ${IMAGE}:latest"
  dc pull "$SERVICE"
fi

# 3. (Re)create the container with the new image.
log "Bringing up '${SERVICE}'"
dc up -d "$SERVICE"

# 4. Wait for the container to report healthy.
cid="$(dc ps -q "$SERVICE")"
[ -n "$cid" ] || die "could not resolve container id for service '$SERVICE'"

log "Waiting up to ${HEALTH_TIMEOUT}s for '${SERVICE}' to become healthy"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
while :; do
  status="$(docker inspect -f '{{ if .State.Health }}{{ .State.Health.Status }}{{ else }}none{{ end }}' "$cid" 2>/dev/null || echo unknown)"
  case "$status" in
    healthy)
      log "Container is healthy"
      break
      ;;
    none)
      die "service '$SERVICE' has no healthcheck — cannot verify deploy"
      ;;
    unhealthy)
      docker logs --tail 50 "$cid" || true
      die "container became unhealthy"
      ;;
  esac
  if [ "$(date +%s)" -ge "$deadline" ]; then
    docker logs --tail 50 "$cid" || true
    die "timed out waiting for healthy (last status: $status)"
  fi
  sleep 3
done

# 5. Reclaim disk: drop dangling images left behind by the new pull.
log "Pruning dangling images"
docker image prune -f >/dev/null || true

# 6. Report what is actually running.
running_image="$(docker inspect -f '{{ .Config.Image }}' "$cid" 2>/dev/null || echo '?')"
running_digest="$(docker inspect -f '{{ if .RepoDigests }}{{ index .RepoDigests 0 }}{{ end }}' "$cid" 2>/dev/null || true)"
log "Running image: ${running_image}${running_digest:+ (${running_digest})}"
[ -n "${IMAGE_SHA:-}" ] && log "Built from tag: ${IMAGE_SHA}"
log "Deploy complete."
