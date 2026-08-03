# syntax=docker/dockerfile:1.7
# check=skip=SecretsUsedInArgOrEnv
ARG BASE_IMAGE=registry.cn-hangzhou.aliyuncs.com/shanjing/node:24-bookworm-slim-pnpm11.5.0-deno2.9.3-pm26.0.14

FROM ${BASE_IMAGE} AS build

WORKDIR /app

COPY . .

ARG NPM_REGISTRY_URL=https://packages.aliyun.com/5eb77c7538076f00011bd238/npm/npm-registry/
ARG NPM_REGISTRY_AUTH_TOKEN

# better-sqlite3 仅为测试用 devDependency；镜像构建不需要其 native 二进制。
# package.json 的 pnpm.neverBuiltDependencies 跳过它的 node-gyp（slim 镜像无 Python）。
RUN set -eu; \
    _NPM_REGISTRY_URL="${NPM_REGISTRY_URL:-}"; \
    _NPM_REGISTRY_AUTH_TOKEN="${NPM_REGISTRY_AUTH_TOKEN:-}"; \
    _NPM_REGISTRY_HOST_PATH=""; \
    if [ -n "$_NPM_REGISTRY_URL" ]; then \
        pnpm config set @shanjing:registry "$_NPM_REGISTRY_URL"; \
    fi; \
    if [ -n "$_NPM_REGISTRY_AUTH_TOKEN" ]; then \
        if [ -z "$_NPM_REGISTRY_URL" ]; then \
            echo "NPM_REGISTRY_URL is required when NPM_REGISTRY_AUTH_TOKEN is set." >&2; \
            exit 1; \
        fi; \
        _NPM_REGISTRY_HOST_PATH="$(printf '%s' "$_NPM_REGISTRY_URL" | sed -E 's#^https?://##; s#/*$##')"; \
        pnpm config set "//${_NPM_REGISTRY_HOST_PATH}/:_authToken" "$_NPM_REGISTRY_AUTH_TOKEN"; \
    fi; \
    if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile --prod=false; \
    else \
        pnpm install --no-frozen-lockfile --prod=false; \
    fi; \
    test -x node_modules/.bin/astro; \
    if [ -n "$_NPM_REGISTRY_HOST_PATH" ]; then \
        pnpm config delete "//${_NPM_REGISTRY_HOST_PATH}/:_authToken" || true; \
    fi

RUN pnpm build

ARG USER_SENTRY_UPLOAD_SOURCEMAPS=0
ARG USER_SENTRY_URL
ARG USER_SENTRY_ORG
ARG USER_SENTRY_PROJECT
ARG USER_SENTRY_DIST=deno
ARG USER_SENTRY_RELEASE
ARG USER_SENTRY_AUTH_TOKEN
ARG USER_SENTRY_ALLOW_INSECURE_SSL=1
ARG USER_SENTRY_URL_PREFIX
ARG USER_SENTRY_SERVER_SOURCE_URL_PREFIX
ARG USER_SENTRY_QUEUE_SOURCE_URL_PREFIX

ARG SENTRY_UPLOAD_SOURCEMAPS
ARG SENTRY_URL
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_DIST
ARG SENTRY_RELEASE
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ALLOW_INSECURE_SSL
ARG SENTRY_URL_PREFIX
ARG SENTRY_SERVER_SOURCE_URL_PREFIX
ARG SENTRY_QUEUE_SOURCE_URL_PREFIX

RUN _SENTRY_UPLOAD_SOURCEMAPS="${SENTRY_UPLOAD_SOURCEMAPS:-$USER_SENTRY_UPLOAD_SOURCEMAPS}" && \
    _SENTRY_URL="${SENTRY_URL:-$USER_SENTRY_URL}" && \
    _SENTRY_ORG="${SENTRY_ORG:-$USER_SENTRY_ORG}" && \
    _SENTRY_PROJECT="${SENTRY_PROJECT:-$USER_SENTRY_PROJECT}" && \
    _SENTRY_DIST="${SENTRY_DIST:-$USER_SENTRY_DIST}" && \
    _SENTRY_RELEASE="${SENTRY_RELEASE:-$USER_SENTRY_RELEASE}" && \
    _SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN:-$USER_SENTRY_AUTH_TOKEN}" && \
    _SENTRY_ALLOW_INSECURE_SSL="${SENTRY_ALLOW_INSECURE_SSL:-$USER_SENTRY_ALLOW_INSECURE_SSL}" && \
    _SENTRY_URL_PREFIX="${SENTRY_URL_PREFIX:-$USER_SENTRY_URL_PREFIX}" && \
    _SENTRY_SERVER_SOURCE_URL_PREFIX="${SENTRY_SERVER_SOURCE_URL_PREFIX:-$USER_SENTRY_SERVER_SOURCE_URL_PREFIX}" && \
    _SENTRY_QUEUE_SOURCE_URL_PREFIX="${SENTRY_QUEUE_SOURCE_URL_PREFIX:-$USER_SENTRY_QUEUE_SOURCE_URL_PREFIX}" && \
    if [ "$_SENTRY_UPLOAD_SOURCEMAPS" = "1" ]; then \
        if [ -z "$_SENTRY_RELEASE" ]; then \
            echo "SENTRY_RELEASE is required when SENTRY_UPLOAD_SOURCEMAPS=1." >&2; \
            exit 1; \
        fi; \
        if [ -z "$_SENTRY_AUTH_TOKEN" ]; then \
            echo "SENTRY_AUTH_TOKEN build arg is required when SENTRY_UPLOAD_SOURCEMAPS=1." >&2; \
            exit 1; \
        fi; \
        if ! find dist/sentry-sourcemaps -name "*.map" -type f | grep -q .; then \
            echo "No sourcemaps found under dist/sentry-sourcemaps." >&2; \
            exit 1; \
        fi; \
        if [ "$_SENTRY_ALLOW_INSECURE_SSL" = "1" ]; then \
            printf "http.verify_ssl=false\n" > /tmp/sentry.properties; \
            export SENTRY_PROPERTIES=/tmp/sentry.properties; \
        fi; \
        SENTRY_AUTH_TOKEN="$_SENTRY_AUTH_TOKEN" \
        SENTRY_URL="$_SENTRY_URL" \
        SENTRY_ORG="$_SENTRY_ORG" \
        SENTRY_PROJECT="$_SENTRY_PROJECT" \
        SENTRY_RELEASE="$_SENTRY_RELEASE" \
        SENTRY_DIST="$_SENTRY_DIST" \
        SENTRY_URL_PREFIX="$_SENTRY_URL_PREFIX" \
        SENTRY_SERVER_SOURCE_URL_PREFIX="$_SENTRY_SERVER_SOURCE_URL_PREFIX" \
        SENTRY_QUEUE_SOURCE_URL_PREFIX="$_SENTRY_QUEUE_SOURCE_URL_PREFIX" \
        pnpm sentry:sourcemaps && \
        rm -rf dist/sentry-sourcemaps; \
    fi

FROM ${BASE_IMAGE} AS runner

ARG USER_SENTRY_RELEASE
ARG SENTRY_RELEASE=${USER_SENTRY_RELEASE}
ARG USER_SENTRY_DIST=deno
ARG SENTRY_DIST=${USER_SENTRY_DIST}

ENV NODE_ENV=production
ENV PORT=8000
# QUEUE roles: 0=web-only, 1=queue-only, 2=web+queue (default entry: start.sh)
ENV QUEUE=0
ENV QUEUE_PM2_HOME=/app/.pm2-queue
ENV PM2_HOME=/app/.pm2-queue
ENV SENTRY_RELEASE=${SENTRY_RELEASE}
ENV SENTRY_DIST=${SENTRY_DIST}
ENV DENO_DIR=/app/.deno-cache
ENV DENO_CACHE_REQUIRED=1

WORKDIR /app

COPY --from=build /app/docker/deno.lock ./deno.lock
COPY --from=build /app/dist/deno ./dist/deno
# Runtime shell entrypoints (start.sh / start-web.sh / ...) come only from prepare-runtime
# writing into dist/deno/scripts during `pnpm build`. Do not re-copy scripts/runtime here.

RUN deno cache \
    --lock=./deno.lock \
    --frozen \
    --no-npm \
    --node-modules-dir=none \
    ./dist/deno/server/serve.mjs \
    ./dist/deno/queues/worker.mjs \
    ./dist/deno/queues/scheduler.mjs

RUN chmod +x ./dist/deno/scripts/start.sh \
    ./dist/deno/scripts/start-web.sh \
    ./dist/deno/scripts/start-queue.sh \
    ./dist/deno/scripts/start-queue-daemon.sh \
    ./dist/deno/scripts/stop-queue.sh \
    ./dist/deno/scripts/pre-update.sh \
    ./dist/deno/scripts/post-update.sh \
    && test -x ./dist/deno/scripts/start.sh \
    && ln -sf /app/dist/deno/scripts/pre-update.sh /pre-update.sh \
    && ln -sf /app/dist/deno/scripts/post-update.sh /post-update.sh

# jemalloc: provided by BASE_IMAGE (docker/base-node.Dockerfile installs libjemalloc2).
# Do NOT enable LD_PRELOAD by default. Opt-in at deploy time:
#   LD_PRELOAD=/usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2
#   MALLOC_CONF=background_thread:true,dirty_decay_ms:5000,narenas:2

EXPOSE 8000

# Invoke via /bin/sh so Node base-image docker-entrypoint never rewrites the command to `node`.
CMD ["/bin/sh", "/app/dist/deno/scripts/start.sh"]
