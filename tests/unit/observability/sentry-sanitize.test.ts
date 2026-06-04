import { describe, expect, it } from "vitest";

import { sanitizeSentryExtra } from "@/observability/sentry-sanitize";

describe("sanitizeSentryExtra", () => {
    it("redacts sensitive headers and secrets recursively", () => {
        const sanitized = sanitizeSentryExtra({
            headers: new Headers({
                authorization: "Bearer token",
                "x-request-id": "request-1",
            }),
            nested: {
                password: "secret-password",
                profile: {
                    name: "Tian",
                },
            },
            token: "raw-token",
        });

        expect(sanitized).toEqual({
            headers: {
                authorization: "[Filtered]",
                "x-request-id": "request-1",
            },
            nested: {
                password: "[Filtered]",
                profile: {
                    name: "Tian",
                },
            },
            token: "[Filtered]",
        });
    });

    it("redacts GraphQL variables", () => {
        const sanitized = sanitizeSentryExtra({
            operationName: "createUser",
            variables: {
                password: "secret-password",
                username: "admin",
            },
        });

        expect(sanitized).toEqual({
            operationName: "createUser",
            variables: {
                password: "[Filtered]",
                username: "admin",
            },
        });
    });
});
