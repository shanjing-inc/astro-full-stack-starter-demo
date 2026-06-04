import { describe, expect, it } from "vitest";

import {
    captureSentryRequestContext,
    resolveSentryRequestContext,
} from "@/observability/sentry-context";

describe("Sentry request context", () => {
    it("builds request context from Request", () => {
        const request = new Request("https://example.com/api/graphql/member?debug=1", {
            headers: {
                "content-type": "application/json",
            },
            method: "POST",
        });

        expect(resolveSentryRequestContext(request)).toEqual({
            data: undefined,
            headers: {
                "content-type": "application/json",
            },
            method: "POST",
            query_string: "debug=1",
            url: "https://example.com/api/graphql/member?debug=1",
        });
    });

    it("reuses captured request data from object context", () => {
        const request = new Request("https://example.com/api/graphql/member", {
            method: "POST",
        });

        captureSentryRequestContext(request, {
            operationName: "ListShops",
            variables: {
                orderBy: {},
            },
        });

        expect(resolveSentryRequestContext({ request })).toMatchObject({
            data: {
                operationName: "ListShops",
                variables: {
                    orderBy: {},
                },
            },
            method: "POST",
            url: "https://example.com/api/graphql/member",
        });
    });
});
