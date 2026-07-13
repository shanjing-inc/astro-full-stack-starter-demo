import {
    resolveSentrySourcemapUrlPrefixes,
    uploadSentrySourcemaps,
} from "@shanjing/astro-full-stack-starter/observability/sentry/sourcemaps";

uploadSentrySourcemaps({
    dist: "deno",
    sourceContextUrlPrefixes: [
        process.env.SENTRY_SERVER_SOURCE_URL_PREFIX?.trim() || "app:///dist/deno/server/src",
        process.env.SENTRY_QUEUE_SOURCE_URL_PREFIX?.trim() || "app:///dist/deno/queues/src",
    ],
    sourceDir: "src",
    sourcemapDir: "dist/sentry-sourcemaps",
    // Defaults include app:/// (Deno NormalizePaths) + historical prefixes.
    // SENTRY_URL_PREFIX is additive, not a full replace.
    urlPrefixes: resolveSentrySourcemapUrlPrefixes({
        extra: process.env.SENTRY_URL_PREFIX,
    }),
    validateFiles: [
        "dist/deno/server/entry.mjs",
        "dist/deno/queues/worker.mjs",
        "dist/deno/queues/scheduler.mjs",
        "dist/sentry-sourcemaps/server/entry.mjs",
        "dist/sentry-sourcemaps/server/entry.mjs.map",
        "dist/sentry-sourcemaps/queues/worker.mjs",
        "dist/sentry-sourcemaps/queues/worker.mjs.map",
        "dist/sentry-sourcemaps/queues/scheduler.mjs",
        "dist/sentry-sourcemaps/queues/scheduler.mjs.map",
    ],
}).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
