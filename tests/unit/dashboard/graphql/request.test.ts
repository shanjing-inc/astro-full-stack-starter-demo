import { gql } from "@apollo/client/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    configureDashboardGraphQL,
    executeDashboardGraphQL,
    getDashboardGraphQLUri,
} from "@shanjing/astro-full-stack-starter/dashboard/client";

const FIRST_QUERY = gql`
    query getFirstBatchItem {
        getFirstBatchItem {
            id
        }
    }
`;

const SECOND_QUERY = gql`
    query getSecondBatchItem {
        getSecondBatchItem {
            id
        }
    }
`;

describe("executeDashboardGraphQL", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        configureDashboardGraphQL({
            uri: null,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.doUnmock("@apollo/client/core");
        vi.doUnmock("@apollo/client/link/batch-http");
    });

    it("batches concurrent dashboard operations into one request", async () => {
        const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body)) as unknown[];

            expect(Array.isArray(body)).toBe(true);
            expect(body).toHaveLength(2);

            return new Response(
                JSON.stringify([
                    {
                        data: {
                            getFirstBatchItem: {
                                id: "first",
                            },
                        },
                    },
                    {
                        data: {
                            getSecondBatchItem: {
                                id: "second",
                            },
                        },
                    },
                ]),
                {
                    headers: {
                        "content-type": "application/json",
                    },
                    status: 200,
                }
            );
        });
        vi.stubGlobal("fetch", fetchMock);

        const firstRequest = executeDashboardGraphQL<{
            getFirstBatchItem: {
                id: string;
            };
        }>(FIRST_QUERY);
        const secondRequest = executeDashboardGraphQL<{
            getSecondBatchItem: {
                id: string;
            };
        }>(SECOND_QUERY);

        await vi.advanceTimersByTimeAsync(20);

        await expect(firstRequest).resolves.toEqual({
            getFirstBatchItem: {
                id: "first",
            },
        });
        await expect(secondRequest).resolves.toEqual({
            getSecondBatchItem: {
                id: "second",
            },
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [, init] = fetchMock.mock.calls[0] ?? [];
        const body = JSON.parse(String(init?.body)) as unknown[];

        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(2);
    });

    it("uses configured dashboard GraphQL endpoint paths", async () => {
        const fetchMock = vi.fn(async (_input: RequestInfo | URL) => {
            expect(String(_input)).toBe("/api/graphql/custom-admin");

            return new Response(
                JSON.stringify({
                    data: {
                        getFirstBatchItem: {
                            id: "first",
                        },
                    },
                }),
                {
                    headers: {
                        "content-type": "application/json",
                    },
                    status: 200,
                }
            );
        });
        vi.stubGlobal("fetch", fetchMock);
        configureDashboardGraphQL({
            uri: "/api/graphql/custom-admin",
        });

        const request = executeDashboardGraphQL<{
            getFirstBatchItem: {
                id: string;
            };
        }>(FIRST_QUERY);

        await vi.advanceTimersByTimeAsync(20);

        await expect(request).resolves.toEqual({
            getFirstBatchItem: {
                id: "first",
            },
        });
        expect(getDashboardGraphQLUri()).toBe("/api/graphql/custom-admin");
    });

    it("rejects GraphQL errors returned by the server", async () => {
        const fetchMock = vi.fn(async () => {
            return new Response(
                JSON.stringify({
                    errors: [
                        {
                            message: "First error",
                        },
                        {},
                    ],
                }),
                {
                    headers: {
                        "content-type": "application/json",
                    },
                    status: 200,
                }
            );
        });
        vi.stubGlobal("fetch", fetchMock);

        const request = executeDashboardGraphQL(FIRST_QUERY);
        const assertion = expect(request).rejects.toThrow("First error\nGraphQL request failed.");

        await vi.advanceTimersByTimeAsync(20);

        await assertion;
    });

    it("rejects network errors", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("network down");
            })
        );

        const request = executeDashboardGraphQL(FIRST_QUERY);
        const assertion = expect(request).rejects.toThrow("network down");

        await vi.advanceTimersByTimeAsync(20);

        await assertion;
    });

    it("wraps non-error network failures with the default message", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw "network down";
            })
        );

        const request = executeDashboardGraphQL(FIRST_QUERY);
        const assertion = expect(request).rejects.toThrow("GraphQL request failed.");

        await vi.advanceTimersByTimeAsync(20);

        await assertion;
    });

    it("rejects mocked links that complete without data", async () => {
        vi.useRealTimers();
        vi.resetModules();
        vi.doMock("@apollo/client/link/batch-http", () => ({
            BaseBatchHttpLink: class BaseBatchHttpLinkMock {},
        }));
        vi.doMock("@apollo/client/core", () => ({
            gql: (strings: TemplateStringsArray) => strings.join(""),
            ApolloLink: {
                execute: vi.fn(() => ({
                    subscribe(observer: { complete: () => void }) {
                        observer.complete();

                        return {
                            unsubscribe: vi.fn(),
                        };
                    },
                })),
            },
        }));
        const { executeDashboardGraphQL: executeWithMockedLink } =
            await import("@shanjing/astro-full-stack-starter/dashboard/client");

        await expect(executeWithMockedLink(FIRST_QUERY)).rejects.toThrow(
            "GraphQL request completed without data."
        );
    });

    it("ignores mocked link callbacks after the first result settles", async () => {
        vi.useRealTimers();
        vi.resetModules();
        const unsubscribe = vi.fn();
        vi.doMock("@apollo/client/link/batch-http", () => ({
            BaseBatchHttpLink: class BaseBatchHttpLinkMock {},
        }));
        vi.doMock("@apollo/client/core", () => ({
            gql: (strings: TemplateStringsArray) => strings.join(""),
            ApolloLink: {
                execute: vi.fn(() => ({
                    subscribe(observer: {
                        complete: () => void;
                        error: (error: Error) => void;
                        next: (result: { data: { ok: true } }) => void;
                    }) {
                        queueMicrotask(() => {
                            observer.next({
                                data: {
                                    ok: true,
                                },
                            });
                            observer.next({
                                data: {
                                    ok: true,
                                },
                            });
                            observer.error(new Error("late error"));
                            observer.complete();
                        });

                        return {
                            unsubscribe,
                        };
                    },
                })),
            },
        }));
        const { executeDashboardGraphQL: executeWithMockedLink } =
            await import("@shanjing/astro-full-stack-starter/dashboard/client");

        await expect(executeWithMockedLink<{ ok: true }>(FIRST_QUERY)).resolves.toEqual({
            ok: true,
        });
        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
});
