import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb, getSession } = vi.hoisted(() => ({
    getDb: vi.fn(),
    getSession: vi.fn(),
}));

vi.mock("@/db/client", () => ({
    createCloudflareD1DatabaseProvider: vi.fn(() => ({
        getDb,
    })),
    getCloudflareD1Env: vi.fn(() => ({})),
}));

vi.mock("@/lib/auth", () => ({
    getAuth: vi.fn(() => ({
        api: {
            createUser: vi.fn(),
            getSession,
        },
    })),
}));

vi.mock("@/queues/runtime", () => ({
    createQueueExecutionStore: vi.fn(() => ({})),
    createQueueRuntime: vi.fn(() => ({})),
}));

import { createGraphQLContext } from "@/graphql/context";
import { contextCacheSymbol } from "@pothos/core";
import { createGraphQLRequestContextCache } from "@shanjing/astro-full-stack-starter/graphql/cache/request";

beforeEach(() => {
    getDb.mockReturnValue({});
    getSession.mockResolvedValue(null);
});

describe("Cloudflare GraphQL Request cache context", () => {
    it("shares the Pothos context cache for one Yoga HTTP batch Request", async () => {
        const request = new Request("https://example.test/graphql");
        const getRequestContextCache = createGraphQLRequestContextCache();
        const first = await createGraphQLContext(request, getRequestContextCache(request));
        const second = await createGraphQLContext(request, getRequestContextCache(request));
        expect((second as Record<symbol, unknown>)[contextCacheSymbol]).toBe(
            (first as Record<symbol, unknown>)[contextCacheSymbol]
        );
    });

    it("isolates the Pothos context cache between HTTP Requests", async () => {
        const getRequestContextCache = createGraphQLRequestContextCache();
        const firstRequest = new Request("https://example.test/graphql");
        const secondRequest = new Request("https://example.test/graphql");
        const first = await createGraphQLContext(
            firstRequest,
            getRequestContextCache(firstRequest)
        );
        const second = await createGraphQLContext(
            secondRequest,
            getRequestContextCache(secondRequest)
        );
        expect((second as Record<symbol, unknown>)[contextCacheSymbol]).not.toBe(
            (first as Record<symbol, unknown>)[contextCacheSymbol]
        );
    });
});
