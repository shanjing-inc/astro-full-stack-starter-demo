import type { SentryRequestContext } from "./sentry-types.ts";

const requestContexts = new WeakMap<Request, SentryRequestContext>();

export function getRequestFromReportContext(context: unknown): Request | undefined {
    if (context instanceof Request) {
        return context;
    }

    if (typeof context !== "object" || context === null) {
        return undefined;
    }

    const request = (context as { request?: unknown }).request;

    return request instanceof Request ? request : undefined;
}

function getRequestQueryString(request: Request) {
    try {
        return new URL(request.url).search.slice(1);
    } catch {
        return undefined;
    }
}

export function createSentryRequestContext(request: Request, data?: unknown): SentryRequestContext {
    return {
        data,
        headers: Object.fromEntries(request.headers.entries()),
        method: request.method,
        query_string: getRequestQueryString(request),
        url: request.url,
    };
}

export function captureSentryRequestContext(request: Request, data?: unknown) {
    const previousContext = requestContexts.get(request);

    requestContexts.set(request, {
        ...createSentryRequestContext(request, data),
        ...previousContext,
        data: data ?? previousContext?.data,
    });
}

export function resolveSentryRequestContext(context: unknown) {
    const request = getRequestFromReportContext(context);

    if (!request) {
        return undefined;
    }

    return requestContexts.get(request) ?? createSentryRequestContext(request);
}
