import { getCloudflareD1Env } from "@/db/client";
import { getEnvVar } from "@shanjing/astro-full-stack-starter/runtime/env";
import { createAstroSentryReporter } from "@shanjing/astro-full-stack-starter/observability/sentry/astro";

export {
    NoReportError,
    shouldReport,
} from "@shanjing/astro-full-stack-starter/observability/sentry";

function getCloudflareEnvValue(name: "SENTRY_DSN" | "SENTRY_RELEASE") {
    return getCloudflareD1Env()[name]?.trim();
}

function getSentryDsn() {
    return getEnvVar("SENTRY_DSN")?.trim() || getCloudflareEnvValue("SENTRY_DSN");
}

function getSentryRelease() {
    return getEnvVar("SENTRY_RELEASE")?.trim() || getCloudflareEnvValue("SENTRY_RELEASE");
}

const sentryReporter = createAstroSentryReporter({
    env: () => ({
        dsn: getSentryDsn(),
        release: getSentryRelease(),
    }),
});

export const initSentry = sentryReporter.initSentry;
export const reportException = sentryReporter.reportException;
export const reportMessage = sentryReporter.reportMessage;
