import { describe, expect, it, vi } from "vitest";

const { useSentryGraphQLMock } = vi.hoisted(() => ({
    useSentryGraphQLMock: vi.fn((endpoint: string) => `sentry:${endpoint}`),
}));

vi.mock("@/graphql/context", () => ({
    createGraphQLContext: vi.fn(),
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

describe("Cloudflare GraphQL endpoint adapters", () => {
    it("registers the Sentry GraphQL plugin for the member endpoint", async () => {
        const { adapter } = await import("@/graphql/adapters/member");

        expect(useSentryGraphQLMock).toHaveBeenCalledWith("member");
        expect(adapter.plugins).toEqual(["sentry:member"]);
        expect(adapter.batching).toEqual({ limit: 10 });
    });

    it("registers the Sentry GraphQL plugin for the admin endpoint", async () => {
        const { adapter } = await import("@/graphql/adapters/admin");

        expect(useSentryGraphQLMock).toHaveBeenCalledWith("admin");
        expect(adapter.plugins).toEqual(["sentry:admin"]);
        expect(adapter.batching).toEqual({ limit: 10 });
    });
});
