import { GraphQLError } from "graphql";
import * as Sentry from "@sentry/deno";

import { GraphQLResolverError } from "@shanjing/astro-full-stack-starter/graphql/errors";
import { resolveSentryRequestContext } from "./sentry-context.ts";
import { isSentryEnabled, resolveSentryInitOptions } from "./sentry-config.ts";
import { sanitizeSentryExtra, sanitizeSentryValue } from "./sentry-sanitize.ts";

import type {
    ReportableError,
    SentryReportLevel,
    SentryReportParams,
    SentryRuntime,
} from "./sentry-types.ts";

export class NoReportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NoReportError";
    }
}

function isReportableError(error: unknown): error is Error & ReportableError {
    return error instanceof Error && "getReportParams" in error;
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

function mergeReportParams(error: unknown, params: SentryReportParams = {}): SentryReportParams {
    if (!isReportableError(error) || typeof error.getReportParams !== "function") {
        return params;
    }

    const errorParams = error.getReportParams();

    return {
        extra: {
            ...errorParams.extra,
            ...params.extra,
        },
        group: params.group ?? errorParams.group,
        context: params.context ?? errorParams.context,
        request: params.request ?? errorParams.request,
        tags: {
            ...errorParams.tags,
            ...params.tags,
        },
    };
}

function getOriginalError(error: GraphQLError) {
    return error.originalError ?? error.extensions?.originalError;
}

export function shouldReport(error: unknown): boolean {
    if (error instanceof NoReportError || error instanceof GraphQLResolverError) {
        return false;
    }

    if (error instanceof GraphQLError) {
        const originalError = getOriginalError(error);

        if (
            originalError instanceof NoReportError ||
            originalError instanceof GraphQLResolverError
        ) {
            return false;
        }
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

export function initSentry(runtime: SentryRuntime = "astro-server") {
    if (!isSentryEnabled()) {
        return;
    }

    if (Sentry.isInitialized()) {
        return;
    }

    try {
        Sentry.init(resolveSentryInitOptions(runtime));
    } catch {
        // Sentry 初始化失败不影响业务流程。
    }
}

function withReportScope(
    params: SentryReportParams,
    level: SentryReportLevel,
    capture: () => void
) {
    Sentry.withScope((scope) => {
        const fingerprint = normalizeFingerprint(params.group);

        scope.setLevel(level);
        scope.setTags(normalizeTags(params.tags));
        scope.setExtras(sanitizeSentryExtra(params.extra));
        scope.addEventProcessor((event) => ({
            ...event,
            request: sanitizeRequest(resolveReportRequest(params)) ?? event.request,
        }));

        if (fingerprint.length > 0) {
            scope.setFingerprint(fingerprint);
        }

        capture();
    });
}

export function reportException(error: unknown, params: SentryReportParams = {}) {
    if (!shouldReport(error) || !isSentryEnabled()) {
        return;
    }

    const reportParams = mergeReportParams(error, params);
    const capturedError = error instanceof Error ? error : new Error(String(error));

    try {
        withReportScope(reportParams, "error", () => {
            Sentry.captureException(capturedError);
        });
    } catch {
        // Sentry 上报失败不影响业务流程。
    }
}

export function reportMessage(message: string, params: SentryReportParams = {}) {
    if (!isSentryEnabled()) {
        return;
    }

    try {
        withReportScope(params, "warning", () => {
            Sentry.captureMessage(message);
        });
    } catch {
        // Sentry 上报失败不影响业务流程。
    }
}
