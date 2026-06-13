# syntax=docker/dockerfile:1

# ---- Stage 1: build the static PWA with pnpm + Vite -------------------------
FROM node:lts-alpine AS build
WORKDIR /app

# Enable the pnpm shipped with corepack, pinned to the repo's version so CI and
# local builds resolve identically.
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Install dependencies first (cached unless the manifest/lockfile change).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the app: `tsc -b && vite build` -> /app/dist
COPY . .
RUN pnpm run build

# ---- Stage 2: serve the static dist/ with a tiny nginx ----------------------
FROM nginx:alpine AS runtime

# In-container nginx config (SPA fallback + PWA-correct cache headers).
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Only the built static assets ship in the final image — no node_modules, no
# source, no toolchain.
COPY --from=build /app/dist /usr/share/nginx/html

# Container nginx listens on 80 internally; the VPS publishes it on 127.0.0.1:3002.
EXPOSE 80

# nginx:alpine already defaults to `nginx -g 'daemon off;'`; keep it explicit.
CMD ["nginx", "-g", "daemon off;"]
