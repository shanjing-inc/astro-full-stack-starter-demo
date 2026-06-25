import { GraphQLError } from "graphql";
import * as Sentry from "@sentry/astro";

import { getCloudflareD1Env } from "@/db/client";
import { resolveSentryRequestContext } from "@/observability/sentry-context";
import { sanitizeSentryExtra, sanitizeSentryValue } from "@/observability/sentry-sanitize";
import { GraphQLResolverError } from "@shanjing/astro-full-stack-starter/graphql/errors";
import { getEnvVar } from "@shanjing/astro-full-stack-starter/runtime/env";

type SentryReportParams = {
    context?: unknown;
    extra?: Record<string, unknown>;
    group?: string | string[];
    request?: {
        data?: unknown;
        headers?: Record<string, string>;
        method?: string;
        query_string?: string;
        url?: string;
    };
    tags?: Record<string, boolean | number | string>;
};

function getCloudflareEnvValue(name: "SENTRY_DSN" | "SENTRY_RELEASE") {
    return getCloudflareD1Env()[name]?.trim();
}

function getSentryDsn() {
    return getEnvVar("SENTRY_DSN")?.trim() || getCloudflareEnvValue("SENTRY_DSN");
}

function getSentryRelease() {
    return getEnvVar("SENTRY_RELEASE")?.trim() || getCloudflareEnvValue("SENTRY_RELEASE");
}

function normalizeFingerprint(group: SentryReportParams["group"]) {
    if (!group) {
        return [];
    }

    return Array.isArray(group) ? group : [group];
}

function normalizeTags(tags: SentryReportParams["tags"] = {}) {
    return Object.fromEntries(
        Object.entries(tags).map(([key, value]) => [key, String(value)])
    ) as Record<string, string>;
}

function getOriginalError(error: GraphQLError) {
    return error.originalError;
}

function shouldReport(error: unknown): boolean {
    if (error instanceof GraphQLResolverError) {
        return false;
    }

    if (error instanceof GraphQLError) {
        const originalError = getOriginalError(error);

        return !(originalError instanceof GraphQLResolverError);
    }

    return true;
}

function sanitizeRequest(request: SentryReportParams["request"]) {
    if (!request) {
        return undefined;
    }

    return {
        ...request,
        data: sanitizeSentryValue(request.data),
        headers: request.headers
            ? (sanitizeSentryExtra(request.headers) as Record<string, string>)
            : undefined,
    };
}

function resolveReportRequest(params: SentryReportParams) {
    const contextRequest = resolveSentryRequestContext(params.context);

    if (!contextRequest && !params.request) {
        return undefined;
    }

    return {
        ...contextRequest,
        ...params.request,
    };
}

function initSentry() {
    const dsn = getSentryDsn();

    if (!dsn || Sentry.isInitialized()) {
        return;
    }

    try {
        Sentry.init({
            dsn,
            release: getSentryRelease(),
        });
    } catch {
        // Sentry 初始化失败不影响业务流程。
    }
}

export function reportException(error: unknown, params: SentryReportParams = {}) {
    if (!shouldReport(error)) {
        return;
    }

    initSentry();

    if (!Sentry.isInitialized()) {
        return;
    }

    const capturedError = error instanceof Error ? error : new Error(String(error));

    try {
        Sentry.withScope((scope) => {
            const fingerprint = normalizeFingerprint(params.group);

            scope.setLevel("error");
            scope.setTags(normalizeTags(params.tags));
            scope.setExtras(sanitizeSentryExtra(params.extra));
            scope.addEventProcessor((event) => ({
                ...event,
                request: sanitizeRequest(resolveReportRequest(params)) ?? event.request,
            }));

            if (fingerprint.length > 0) {
                scope.setFingerprint(fingerprint);
            }

            Sentry.captureException(capturedError);
        });
    } catch {
        // Sentry 上报失败不影响业务流程。
    }
}

export function reportMessage(message: string, params: SentryReportParams = {}) {
    initSentry();

    if (!Sentry.isInitialized()) {
        return;
    }

    try {
        Sentry.withScope((scope) => {
            const fingerprint = normalizeFingerprint(params.group);

            scope.setLevel("warning");
            scope.setTags(normalizeTags(params.tags));
            scope.setExtras(sanitizeSentryExtra(params.extra));
            scope.addEventProcessor((event) => ({
                ...event,
                request: sanitizeRequest(resolveReportRequest(params)) ?? event.request,
            }));

            if (fingerprint.length > 0) {
                scope.setFingerprint(fingerprint);
            }

            Sentry.captureMessage(message);
        });
    } catch {
        // Sentry 上报失败不影响业务流程。
    }
}
