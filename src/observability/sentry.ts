import { createDenoSentryReporter } from "@shanjing/astro-full-stack-starter/observability/sentry/deno";

export {
    NoReportError,
    shouldReport,
} from "@shanjing/astro-full-stack-starter/observability/sentry";

const sentryReporter = createDenoSentryReporter();

export const initSentry = sentryReporter.initSentry;
export const reportException = sentryReporter.reportException;
export const reportMessage = sentryReporter.reportMessage;
