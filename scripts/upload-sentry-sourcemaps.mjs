import { uploadSentrySourcemaps } from "@shanjing/astro-full-stack-starter/observability/sentry/sourcemaps";

const urlPrefixes = process.env.SENTRY_URL_PREFIX?.trim()
    ? [process.env.SENTRY_URL_PREFIX.trim()]
    : ["app:///dist/cloudflare", "~/dist/cloudflare"];

uploadSentrySourcemaps({
    dist: "cloudflare",
    sourceContextUrlPrefixes: [
        process.env.SENTRY_SOURCE_URL_PREFIX?.trim() || "app:///dist/cloudflare/server/src",
    ],
    sourceDir: "src",
    sourcemapDir: "dist",
    urlPrefixes,
    validateFiles: ["dist/server/entry.mjs", "dist/server/entry.mjs.map"],
}).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
