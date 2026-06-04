import { getEnvVar } from "@shanjing/astro-full-stack-starter/runtime/env";

import type { DenoOptions } from "@sentry/deno";
import type { SentryRuntime } from "./sentry-types.ts";

export function resolveSentryDsn() {
    return getEnvVar("SENTRY_DSN")?.trim() || undefined;
}

export function resolveSentryRelease() {
    return getEnvVar("SENTRY_RELEASE")?.trim() || undefined;
}

export function resolveSentryDist() {
    return getEnvVar("SENTRY_DIST")?.trim() || undefined;
}

export function isSentryEnabled() {
    return Boolean(resolveSentryDsn());
}

export function resolveSentryInitOptions(runtime: SentryRuntime): DenoOptions {
    const dsn = resolveSentryDsn();
    const release = resolveSentryRelease();
    const dist = resolveSentryDist();

    return {
        dsn,
        enabled: isSentryEnabled(),
        ...(release ? { release } : {}),
        ...(dist ? { dist } : {}),
        initialScope: {
            tags: {
                runtime,
            },
        },
    };
}
