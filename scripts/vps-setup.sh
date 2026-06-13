#!/usr/bin/env bash
#
# One-time (idempotent) VPS bootstrap for Stride CD.
#
# What it does:
#   - verifies Docker + the compose plugin are installed
#   - creates the deploy dir (default /opt/stride)
#   - seeds docker-compose.yml + scripts/deploy.sh into it (if this script is
#     run from a repo checkout); the CD workflow re-syncs both on every deploy,
#     so this is just to make the very first manual run possible
#   - OPTIONALLY logs the VPS in to GHCR (only needed for a PRIVATE package)
#
# Safe to re-run. After this, add the GitHub Secrets (see DEPLOY.md) and push
# to main — the pipeline takes over.
#
# Usage:
#   ./scripts/vps-setup.sh                       # public package: no GHCR login
#   GHCR_USER=dkayode GHCR_PAT=ghp_xxx ./scripts/vps-setup.sh   # private package
#
# Environment:
#   STRIDE_DIR   deploy dir (default /opt/stride)
#   GHCR_USER    GHCR username (required iff GHCR_PAT set)
#   GHCR_PAT     read:packages PAT — if set, performs `docker login ghcr.io`
set -euo pipefail

STRIDE_DIR="${STRIDE_DIR:-/opt/stride}"

log() { printf '[vps-setup] %s\n' "$*"; }
die() { printf '[vps-setup] ERROR: %s\n' "$*" >&2; exit 1; }

# --- 1. Preconditions -------------------------------------------------------
command -v docker >/dev/null 2>&1 || die "docker is not installed — install Docker Engine first"
docker compose version >/dev/null 2>&1 \
  || command -v docker-compose >/dev/null 2>&1 \
  || die "docker compose plugin not found — install 'docker compose'"
log "Docker and compose present."

# --- 2. Deploy dir ----------------------------------------------------------
log "Ensuring deploy dir: $STRIDE_DIR"
if [ -w "$(dirname "$STRIDE_DIR")" ] || [ "$(id -u)" = "0" ]; then
  mkdir -p "$STRIDE_DIR" "$STRIDE_DIR/scripts"
else
  die "cannot create $STRIDE_DIR — re-run with sudo, or mkdir it and chown to $USER first"
fi

# --- 3. Seed compose + deploy script (best-effort, for the first manual run) -
# Resolve the repo root relative to this script so it works from any cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$REPO_ROOT/docker-compose.yml" ]; then
  log "Seeding docker-compose.yml -> $STRIDE_DIR/"
  cp "$REPO_ROOT/docker-compose.yml" "$STRIDE_DIR/docker-compose.yml"
fi
if [ -f "$REPO_ROOT/scripts/deploy.sh" ]; then
  log "Seeding scripts/deploy.sh -> $STRIDE_DIR/scripts/"
  cp "$REPO_ROOT/scripts/deploy.sh" "$STRIDE_DIR/scripts/deploy.sh"
  chmod +x "$STRIDE_DIR/scripts/deploy.sh"
else
  log "Note: scripts/deploy.sh not found next to this script — the CD workflow"
  log "      will scp it on the first deploy; this is fine."
fi

# --- 4. Optional GHCR login (private package only) --------------------------
if [ -n "${GHCR_PAT:-}" ]; then
  [ -n "${GHCR_USER:-}" ] || die "GHCR_USER is required when GHCR_PAT is set"
  log "Logging in to ghcr.io as ${GHCR_USER} (for pulling a private package)"
  printf '%s' "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
  log "GHCR login stored in ~/.docker/config.json — deploys can now pull privately."
else
  log "No GHCR_PAT given — assuming the GHCR package is PUBLIC."
  log "If it is PRIVATE, re-run with GHCR_USER=... GHCR_PAT=... (read:packages PAT)."
fi

cat <<EOF

[vps-setup] Done. Deploy dir ready at: $STRIDE_DIR

Next steps:
  1. Confirm the host nginx upstream proxies stride.k4yod3.com -> 127.0.0.1:3002
     (this script does NOT touch host nginx/TLS — see DEPLOY.md).
  2. Add the GitHub Secrets listed in DEPLOY.md (VPS_HOST, VPS_USER, VPS_SSH_KEY,
     plus optional VPS_PORT / GHCR_PAT / GHCR_USER).
  3. Push to main (or run the 'Deploy Stride' workflow manually). The pipeline
     builds, pushes to GHCR, and runs scripts/deploy.sh here automatically.
EOF
