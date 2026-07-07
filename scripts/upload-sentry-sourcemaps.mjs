import { uploadSentrySourcemaps } from "@shanjing/astro-full-stack-starter/observability/sentry/sourcemaps";

const urlPrefixes = process.env.SENTRY_URL_PREFIX?.trim()
    ? [process.env.SENTRY_URL_PREFIX.trim()]
    : ["app:///dist/deno", "~/dist/deno"];

uploadSentrySourcemaps({
    dist: "deno",
    sourceContextUrlPrefixes: [
        process.env.SENTRY_SERVER_SOURCE_URL_PREFIX?.trim() || "app:///dist/deno/server/src",
        process.env.SENTRY_QUEUE_SOURCE_URL_PREFIX?.trim() || "app:///dist/deno/queues/src",
    ],
    sourceDir: "src",
    sourcemapDir: "dist/sentry-sourcemaps",
    urlPrefixes,
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
