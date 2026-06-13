# Deploying Stride (CD: Docker → GHCR → VPS)

On every push to `main`, GitHub Actions **gates** (typecheck + test + build),
**builds** a Docker image of the Stride PWA, **pushes** it to GitHub Container
Registry (GHCR), and **deploys** it to the VPS — which pulls and runs the new
image so <https://stride.k4yod3.com> updates automatically. Zero manual steps
after merge.

```
push to main
  └─ gate    : pnpm install --frozen-lockfile → typecheck → test → build   (red = stop)
  └─ build   : buildx → login GHCR (GITHUB_TOKEN) → push :latest + :sha-<short>
  └─ deploy  : scp compose+deploy.sh to VPS → ssh → scripts/deploy.sh
                 (pull :latest → up -d → wait healthy → prune dangling)
```

Pipeline: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) ·
Image: `ghcr.io/dkayode/stride` (**lowercase** — GHCR rejects the capital `D` in
the `DKayode` repo owner, so the image name is hardcoded lowercase).

---

## 1. GitHub Secrets

Add these under **GitHub → repo Settings → Secrets and variables → Actions →
New repository secret**. Names must match the workflow exactly.

| Secret        | Required?   | Purpose |
|---------------|-------------|---------|
| `VPS_HOST`    | **Required** | VPS hostname or IP for SSH (e.g. `stride.k4yod3.com` or the raw IP). |
| `VPS_USER`    | **Required** | SSH username on the VPS (the user that owns `/opt/stride` and can run Docker). |
| `VPS_SSH_KEY` | **Required** | Private SSH key (PEM, full `-----BEGIN…END-----` block) whose public half is in that user's `~/.ssh/authorized_keys`. |
| `VPS_PORT`    | Optional    | SSH port. Defaults to `22` if unset. |
| `GHCR_PAT`    | Optional    | A `read:packages` Personal Access Token. **Only needed if the GHCR package is PRIVATE.** If set, the VPS runs `docker login ghcr.io` each deploy. Leave unset for a public package. |
| `GHCR_USER`   | Optional    | GHCR username that owns `GHCR_PAT`. Defaults to the pushing actor (`github.actor`). Set this only if the PAT belongs to a different account. |

> `GITHUB_TOKEN` is **not** something you add — GitHub injects it automatically.
> The build job uses it (with `permissions: packages: write`) to push to GHCR.
> It is **runner-only** and is never sent to the VPS.

There are **no other** secrets. Do not add anything the workflow doesn't read.

---

## 2. One-time VPS bootstrap

SSH to the VPS, get the repo (or just the two files), and run the bootstrap.
It is idempotent — safe to re-run.

```bash
# on the VPS, as the deploy user (VPS_USER)
git clone https://github.com/DKayode/stride.git
cd stride

# Public GHCR package (simplest): no login needed
sudo STRIDE_DIR=/opt/stride ./scripts/vps-setup.sh
# (or, if /opt is writable by your user, drop sudo)

# PRIVATE GHCR package instead: log the VPS in once
GHCR_USER=dkayode GHCR_PAT=ghp_xxx ./scripts/vps-setup.sh
```

`vps-setup.sh` verifies Docker + compose, creates `/opt/stride` (and
`/opt/stride/scripts`), seeds `docker-compose.yml` + `scripts/deploy.sh`, and
optionally logs in to GHCR. The CD workflow re-`scp`s both files on every
deploy, so the seeded copies just make the *first* manual run possible.

> **Permissions:** the `VPS_USER` must be able to run Docker without sudo
> (`sudo usermod -aG docker $USER`, then re-login) and must own `/opt/stride`.

### Public vs private GHCR package

- **Public** (recommended for simplicity): on GitHub go to the `stride` package
  → **Package settings → Change visibility → Public**. Then `GHCR_PAT`/`GHCR_USER`
  are unnecessary and the VPS pulls anonymously.
- **Private**: provide `GHCR_PAT` (a `read:packages` PAT belonging to `GHCR_USER`)
  — either as a GitHub Secret (the deploy logs in each run) or via `vps-setup.sh`
  once (stored in `~/.docker/config.json`). The PAT account must have read access
  to the package.

---

## 3. The nginx upstream (already configured — do NOT change)

The VPS **host nginx** already terminates TLS for `stride.k4yod3.com` and reverse
-proxies to the container:

```
Internet ──TLS──▶ host nginx (stride.k4yod3.com)  ──▶  proxy_pass http://127.0.0.1:3002;
                                                            │
                                          docker: ports "127.0.0.1:3002:80"
                                                            │
                                              container nginx :80  ──▶  /usr/share/nginx/html (dist)
```

This CD setup **does not touch** the host nginx, TLS, certbot, or Caddy. The
container publishes **only** on `127.0.0.1:3002` (localhost-bound, see
[`docker-compose.yml`](docker-compose.yml)), exactly matching the existing
`proxy_pass http://127.0.0.1:3002;` upstream. Nothing about the host's TLS or
vhost config needs to change for deploys to work.

---

## 4. Trigger & observe a deploy

**Trigger:**
- Push (or merge) to `main`, **or**
- **Actions tab → "Deploy Stride" → Run workflow** (`workflow_dispatch`).

**Observe in CI:** GitHub **Actions** tab → latest *Deploy Stride* run → watch
`gate` → `build` → `deploy`. A failing typecheck/test in `gate` blocks the image
build and deploy entirely.

**Observe on the VPS:**
```bash
cd /opt/stride
docker compose ps          # stride should be "running (healthy)"
docker compose logs -f      # container nginx access/error logs
docker inspect -f '{{.State.Health.Status}}' stride   # -> healthy
curl -I http://127.0.0.1:3002/                         # -> 200, Cache-Control: no-store on /
```

A correct deploy ends with `scripts/deploy.sh` printing
`[deploy] Container is healthy` and `[deploy] Deploy complete.`

---

## 5. Rollback to a previous version

Every build pushes an immutable `:sha-<short>` tag alongside `:latest`, and the
deploy prunes **dangling-only** images — so previously pulled SHA tags remain
valid rollback targets. `docker-compose.yml` pins `:latest`, so rolling back
means re-pointing `:latest` at an old SHA and redeploying **without** pulling:

```bash
# on the VPS, as the deploy user
cd /opt/stride

# 1. Pick the SHA tag to roll back to (from the Actions run, a commit, or:
#    `docker images ghcr.io/dkayode/stride`). Example: sha-1a2b3c4
ROLLBACK_TAG=sha-1a2b3c4

# 2. Pull that exact image (skip if it's still present locally)
docker pull ghcr.io/dkayode/stride:${ROLLBACK_TAG}

# 3. Re-point :latest at it locally
docker tag ghcr.io/dkayode/stride:${ROLLBACK_TAG} ghcr.io/dkayode/stride:latest

# 4. Redeploy WITHOUT pulling (so step 3's retag isn't overwritten by GHCR)
SKIP_PULL=1 ./scripts/deploy.sh
```

`SKIP_PULL=1` makes `deploy.sh` reuse the locally retagged image instead of
pulling `:latest` from GHCR. The next push to `main` will naturally move
`:latest` forward again.

> To find available SHA tags, see the GitHub **Packages** page for `stride`, or
> the SHA printed in each deploy's `[deploy] Built from tag:` line.

---

## 6. Local verification (what was tested here)

The image and serving config were verified locally with real Docker:

```bash
docker build -t stride:test .
docker run -d --name stride-test -p 127.0.0.1:3002:80 stride:test
curl -I http://127.0.0.1:3002/                       # 200, Cache-Control: no-store
curl -I http://127.0.0.1:3002/sw.js                  # 200, Cache-Control: no-cache (never long-cached)
curl -I http://127.0.0.1:3002/manifest.webmanifest   # application/manifest+json
```

The **deploy to the real VPS only happens when you push to `main` with the
Secrets above configured.** The VPS is not reachable from the build environment,
so no remote deploy was faked or executed — the `deploy` job and `vps-setup.sh`
are authored and locally exercised (via `SKIP_PULL=1`), and run for real on your
first push.
