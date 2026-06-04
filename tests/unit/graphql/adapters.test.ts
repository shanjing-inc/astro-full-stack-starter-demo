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

vi.mock("@/graphql/schemas/super-admin", () => ({
    superAdminSchema: "super-admin-schema",
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

    it("registers the Sentry GraphQL plugin for the super-admin endpoint", async () => {
        const { adapter } = await import("@/graphql/adapters/super-admin");

        expect(useSentryGraphQLMock).toHaveBeenCalledWith("super-admin");
        expect(adapter.plugins).toEqual(["sentry:super-admin"]);
        expect(adapter.batching).toEqual({ limit: 10 });
    });
});
