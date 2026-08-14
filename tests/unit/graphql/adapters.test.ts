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

const { createGraphQLContextMock, useSentryGraphQLMock } = vi.hoisted(() => ({
    createGraphQLContextMock: vi.fn((request: Request, cache: GraphQLRequestContextCache) => ({
        ...cache,
        cache,
        request,
    })),
    useSentryGraphQLMock: vi.fn((endpoint: string) => `sentry:${endpoint}`),
}));

vi.mock("@/graphql/context", () => ({
    createGraphQLContext: createGraphQLContextMock,
}));

vi.mock("@/graphql/schemas/member", () => ({
    memberSchema: "member-schema",
}));

vi.mock("@/graphql/schemas/admin", () => ({
    adminSchema: "admin-schema",
}));

vi.mock("@/graphql/sentry-plugin", () => ({
    useSentryGraphQL: useSentryGraphQLMock,
}));

import { adapter as adminAdapter } from "@/graphql/adapters/admin";
import { adapter as memberAdapter } from "@/graphql/adapters/member";

interface TestContext extends GraphQLRequestContextCache {
    cache: GraphQLRequestContextCache;
    request: Request;
}

type TestAdapter = {
    batching?: { limit?: number } | boolean;
    context?: (input: never) => unknown;
    plugins?: unknown[];
};

async function getContext(adapter: TestAdapter, request: Request) {
    return adapter.context?.({ request } as never) as Promise<TestContext>;
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

describe("Cloudflare GraphQL endpoint adapters", () => {
    it("registers the Sentry GraphQL plugin for the member endpoint", () => {
        expect(useSentryGraphQLMock).toHaveBeenCalledWith("member");
        expect(memberAdapter.plugins).toEqual(["sentry:member"]);
        expect(memberAdapter.batching).toEqual({ limit: 10 });
    });

    it("registers the Sentry GraphQL plugin for the admin endpoint", () => {
        expect(useSentryGraphQLMock).toHaveBeenCalledWith("admin");
        expect(adminAdapter.plugins).toEqual(["sentry:admin"]);
        expect(adminAdapter.batching).toEqual({ limit: 10 });
    });

    it.each([
        ["member", memberAdapter],
        ["admin", adminAdapter],
    ])("reuses one starter cache for repeated %s adapter context calls", async (_name, adapter) => {
        const request = new Request("https://example.test/graphql");
        const first = await getContext(adapter, request);
        const second = await getContext(adapter, request);

        expect(first.request).toBe(request);
        expect(second.request).toBe(request);
        expect(first.cache).toBe(second.cache);
    });

    it("creates isolated cache identities for independent Requests", async () => {
        const first = await getContext(adminAdapter, new Request("https://example.test/graphql"));
        const second = await getContext(adminAdapter, new Request("https://example.test/graphql"));

        expect(first.cache).not.toBe(second.cache);
    });

    it.each([
        ["member", memberAdapter],
        ["admin", adminAdapter],
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

            const contextCalls = createGraphQLContextMock.mock.calls.slice(-2);
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
