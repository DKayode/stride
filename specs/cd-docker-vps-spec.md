PROJECT: Stride — Continuous Deployment (Docker → GHCR → VPS) on merge to main

GOAL
When a change is merged/pushed to `main`, GitHub Actions builds a Docker image of the
Stride PWA, pushes it to GitHub Container Registry (GHCR), and the VPS pulls and runs the
new image so the live site at https://stride.k4yod3.com updates automatically — zero manual
steps after merge.

FIXED ENVIRONMENT (do not re-architect these)
- App is the existing Vite PWA in this repo (static build → dist/).
- Registry: GHCR — image ghcr.io/dkayode/stride (MUST be lowercase).
- CI: GitHub Actions (repo: github.com/DKayode/stride).
- Domain/TLS/reverse-proxy: ALREADY HANDLED by nginx ON the VPS. nginx proxies
  stride.k4yod3.com → 127.0.0.1:3002. DO NOT add Caddy, certbot, or a host reverse proxy.
- Container MUST be published on the VPS at 127.0.0.1:3002 (localhost-only bind) so the
  existing nginx upstream keeps working unchanged.
- Deploy trigger: push to `main` only.

CONSTRAINTS
- Multi-stage Docker build: pnpm install + vite build, then serve the static dist/ with
  a small nginx inside the container. Final image must be small (alpine) and not contain
  node_modules or source.
- Container's internal web server serves the SPA correctly: history-API fallback to
  index.html, correct MIME for .webmanifest, and CRITICALLY: never cache index.html or
  sw.js (must be no-store/no-cache) while long-caching hashed /assets/* — otherwise PWA
  clients won't pick up new deploys.
- Image tags: push BOTH `latest` and the commit SHA (`sha-<short>`), so rollback = re-pull
  a previous SHA tag.
- Secrets via GitHub Actions secrets only — NEVER hardcode host/user/keys. Use GITHUB_TOKEN
  for GHCR push. VPS access via secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY, optional VPS_PORT.
- Deploy step is idempotent and safe to re-run; restart must not drop the site for more than
  a moment (pull first, then up -d). Prune dangling images after deploy.
- Production-ready, no placeholders. All config must be valid and self-consistent.

DELIVERABLES (implement ONE AT A TIME, verify each)
1. `Dockerfile` — multi-stage (node:lts-alpine build with pnpm via corepack → nginx:alpine
   runtime). Container nginx listens on 80 internally.
2. `docker/nginx.conf` — SPA fallback, no-cache for index.html + sw.js + manifest, immutable
   long cache for /assets/*, gzip, security headers. (This is the IN-CONTAINER nginx, not
   the VPS host nginx.)
3. `.dockerignore` — exclude node_modules, dist, .git, orchestrator, specs, *.md (keep what
   the build needs), tmux files, etc. Keep build context minimal.
4. `docker-compose.yml` — service `stride` using image ghcr.io/dkayode/stride:latest,
   ports "127.0.0.1:3002:80", restart: unless-stopped, healthcheck. This compose file lives
   on the VPS and is what the deploy restarts.
5. `.github/workflows/deploy.yml` — on push to main:
   - job BUILD: checkout, set up Buildx, log in to GHCR with GITHUB_TOKEN, build & push
     ghcr.io/dkayode/stride:latest and :sha-<short>, with build cache.
   - job DEPLOY (needs build): SSH to the VPS (secrets), docker login ghcr, pull the new
     image, docker compose up -d, prune old images, verify the container is healthy.
   - Also run typecheck + tests + build as a gate BEFORE building the image (fail fast).
6. `scripts/deploy.sh` — the VPS-side pull+restart+prune+healthcheck logic, invoked by the
   workflow (keeps the YAML thin and lets you run a manual deploy too).
7. `scripts/vps-setup.sh` + `DEPLOY.md` — one-time VPS bootstrap (create deploy dir, place
   compose file, `docker login ghcr.io` with a PAT for pulling the private package OR note
   to make the GHCR package public) AND full docs: the exact GitHub Secrets to add, how the
   nginx upstream maps to 127.0.0.1:3002, how to roll back to a previous SHA tag, and how to
   trigger/observe a deploy.

SUCCESS CRITERIA
- `docker build -t stride:test .` succeeds locally and the resulting image, run with
  `-p 127.0.0.1:3002:80`, serves the app at http://127.0.0.1:3002 (verify with curl: 200 on
  /, correct Cache-Control on /sw.js = no-cache, 200 on /manifest.webmanifest).
- The workflow YAML is valid (passes `actionlint` or a YAML/syntax check) and references only
  declared secrets.
- Image is multi-stage and small (no node_modules in final layer); `docker history` shows the
  runtime stage is nginx:alpine + static files only.
- DEPLOY.md lists every required GitHub Secret and the one-time VPS steps, and the rollback
  procedure is concrete (a copy-pasteable command using a SHA tag).
- Nothing touches the VPS host nginx config or TLS — container binds 127.0.0.1:3002 only.
- Pre-build gate runs typecheck + tests; a red test blocks deploy.

NOTES
- The agents CANNOT reach the real VPS from here (no creds in this environment). Verify
  everything locally (docker build + run + curl). The real deploy runs when the user pushes
  to main with secrets configured. Document that clearly; do not fake a remote deploy.
