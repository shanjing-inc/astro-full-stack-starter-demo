import { GraphQLError } from "graphql";
import { afterEach, describe, expect, it } from "vitest";

import { GraphQLResolverError } from "@shanjing/astro-full-stack-starter/graphql/errors";
import { resolveSentryInitOptions } from "@/observability/sentry-config";
import { NoReportError, shouldReport } from "@/observability/sentry";

const sentryEnvKeys = ["SENTRY_DSN", "SENTRY_RELEASE", "SENTRY_DIST"] as const;
const originalSentryEnv = Object.fromEntries(
    sentryEnvKeys.map((key) => [key, process.env[key]])
) as Record<(typeof sentryEnvKeys)[number], string | undefined>;

afterEach(() => {
    for (const key of sentryEnvKeys) {
        const originalValue = originalSentryEnv[key];

        if (originalValue === undefined) {
            delete process.env[key];
            continue;
        }

        process.env[key] = originalValue;
    }
});

describe("shouldReport", () => {
    it("skips explicit no-report errors", () => {
        expect(shouldReport(new NoReportError("skip"))).toBe(false);
    });

    it("skips GraphQL business errors", () => {
        expect(shouldReport(new GraphQLResolverError("业务错误"))).toBe(false);
    });

    it("skips GraphQL errors with business originalError", () => {
        const error = new GraphQLError("wrapped", {
            originalError: new GraphQLResolverError("业务错误"),
        });

        expect(shouldReport(error)).toBe(false);
    });

    it("reports unexpected errors", () => {
        expect(shouldReport(new Error("unexpected"))).toBe(true);
    });
});

describe("resolveSentryInitOptions", () => {
    it("attaches release when configured", () => {
        process.env.SENTRY_DSN = " https://example.invalid/1 ";
        process.env.SENTRY_RELEASE = " app@2026.05.07 ";
        process.env.SENTRY_DIST = " deno ";

        expect(resolveSentryInitOptions("queue-worker")).toMatchObject({
            dsn: "https://example.invalid/1",
            enabled: true,
            initialScope: {
                tags: {
                    runtime: "queue-worker",
                },
            },
            release: "app@2026.05.07",
            dist: "deno",
        });
    });

    it("keeps release and dist optional", () => {
        process.env.SENTRY_DSN = "https://example.invalid/1";
        process.env.SENTRY_RELEASE = " ";
        process.env.SENTRY_DIST = " ";

        const options = resolveSentryInitOptions("astro-server");

        expect(options).toMatchObject({
            dsn: "https://example.invalid/1",
            enabled: true,
        });
        expect("release" in options).toBe(false);
        expect("dist" in options).toBe(false);
    });
});
