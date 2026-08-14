import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

import type { GraphQLRequestContextCache } from "@shanjing/astro-full-stack-starter/graphql/cache/request";

const require = createRequire(import.meta.url);
const graphqlRuntime = require("graphql") as typeof import("graphql");
const pothosRuntime = require("@pothos/core") as typeof import("@pothos/core");
const dataloaderPluginRuntime =
    require("@pothos/plugin-dataloader") as typeof import("@pothos/plugin-dataloader");
const yogaRuntime = require("graphql-yoga") as typeof import("graphql-yoga");
const nativeExecutionPlugin = {
    onExecute({
        setExecuteFn,
    }: {
        setExecuteFn: (execute: typeof graphqlRuntime.execute) => void;
    }) {
        setExecuteFn(graphqlRuntime.execute);
    },
    onSubscribe({
        setSubscribeFn,
    }: {
        setSubscribeFn: (subscribe: typeof graphqlRuntime.subscribe) => void;
    }) {
        setSubscribeFn(graphqlRuntime.subscribe);
    },
} satisfies import("graphql-yoga").Plugin;

const { createGraphQLContext } = vi.hoisted(() => ({
    createGraphQLContext: vi.fn((request: Request, cache: GraphQLRequestContextCache) => ({
        ...cache,
        cache,
        request,
    })),
}));

vi.mock("@/graphql/context", () => ({
    createGraphQLContext,
}));

import { adapter as adminAdapter } from "@/graphql/adapters/admin";
import { adapter as memberAdapter } from "@/graphql/adapters/member";

interface TestContext extends GraphQLRequestContextCache {
    cache: GraphQLRequestContextCache;
    request: Request;
}

type TestAdapter = {
    batching?: { limit?: number } | boolean;
    context?: unknown;
};

async function getContext(adapter: TestAdapter, request: Request) {
    if (typeof adapter.context !== "function") {
        return undefined;
    }

    return (adapter.context as (options: never) => unknown)({ request } as never);
}

function getCacheIdentity(context: unknown) {
    return (context as TestContext).cache;
}

function createBatchProbeSchema() {
    const load = vi.fn(async (keys: readonly number[]) => keys.map((key) => key * 10));
    type ProbeSchemaTypes = { Context: TestContext; Plugins: "dataloader" };
    type ProbeSchemaBuilder = InstanceType<typeof pothosRuntime.default<ProbeSchemaTypes>>;
    const ProbeSchemaBuilder = pothosRuntime.default as unknown as new (options: {
        plugins: [typeof dataloaderPluginRuntime.default];
    }) => ProbeSchemaBuilder;
    const builder = new ProbeSchemaBuilder({
        plugins: [dataloaderPluginRuntime.default],
    });

    builder.queryType({
        fields: (t) => ({
            cachedValue: t.loadable({
                load,
                resolve: () => 1,
                type: "Int",
            }),
        }),
    });

    return {
        load,
        schema: builder.toSchema(),
    };
}

function createBatchRequest() {
    return new Request("https://example.test/graphql", {
        body: JSON.stringify([{ query: "{ cachedValue }" }, { query: "{ cachedValue }" }]),
        headers: {
            "content-type": "application/json",
        },
        method: "POST",
    });
}

describe("GraphQL adapter Request cache", () => {
    it.each([
        ["admin", adminAdapter],
        ["member", memberAdapter],
    ])("enables Yoga HTTP batching for the %s endpoint", (_name, adapter) => {
        expect(adapter.batching).toEqual({ limit: 10 });
    });

    it.each([
        ["admin", adminAdapter],
        ["member", memberAdapter],
    ])("reuses the starter cache for repeated %s adapter context calls", async (_name, adapter) => {
        const request = new Request("https://example.test/graphql");
        const first = await getContext(adapter, request);
        const second = await getContext(adapter, request);

        expect((first as TestContext).request).toBe(request);
        expect((second as TestContext).request).toBe(request);
        expect(getCacheIdentity(first!)).toBe(getCacheIdentity(second!));
    });

    it("creates independent cache identities for independent Requests", async () => {
        const first = await getContext(adminAdapter, new Request("https://example.test/graphql"));
        const second = await getContext(adminAdapter, new Request("https://example.test/graphql"));

        expect(getCacheIdentity(first!)).not.toBe(getCacheIdentity(second!));
    });

    it.each([
        ["admin", adminAdapter],
        ["member", memberAdapter],
    ])(
        "shares one DataLoader cache across a real Yoga HTTP batch for %s",
        async (_name, adapter) => {
            const { load, schema } = createBatchProbeSchema();
            const yoga = yogaRuntime.createYoga({
                batching: (adapter as TestAdapter).batching,
                context: adapter.context as never,
                graphqlEndpoint: "/graphql",
                plugins: [nativeExecutionPlugin],
                schema,
            });
            const firstRequest = createBatchRequest();
            const firstResponse = await yoga.fetch(firstRequest);
            const firstBody = await firstResponse.json();

            expect(firstResponse.status).toBe(200);
            expect(firstBody).toEqual([
                { data: { cachedValue: 10 } },
                { data: { cachedValue: 10 } },
            ]);
            expect(load).toHaveBeenCalledTimes(1);
            expect(load.mock.calls[0]?.[0]).toEqual([1]);

            const contextCalls = createGraphQLContext.mock.calls.slice(-2);
            expect(contextCalls).toHaveLength(2);
            expect(contextCalls[0]?.[0]).toBe(firstRequest);
            expect(contextCalls[1]?.[0]).toBe(firstRequest);
            expect(contextCalls[1]?.[1]).toBe(contextCalls[0]?.[1]);

            const secondResponse = await yoga.fetch(createBatchRequest());

            expect(secondResponse.status).toBe(200);
            expect(load).toHaveBeenCalledTimes(2);
        }
    );
});
