import { defineConfig, passthroughImageService } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sentry from "@sentry/astro";
import astroFullstackStarter from "@shanjing/astro-full-stack-starter/integration";
import tailwindcss from "@tailwindcss/vite";

const sentryDsn = process.env.SENTRY_DSN?.trim();

export default defineConfig({
    output: "server",
    adapter: cloudflare({
        imageService: "passthrough",
    }),
    trailingSlash: "never",
    image: {
        service: passthroughImageService(),
    },
    integrations: [
        sentry({
            enabled: Boolean(sentryDsn),
        }),
        react(),
        astroFullstackStarter({
            graphql: {
                endpoints: {
                    member: {
                        path: "/api/graphql/member",
                        adapter: "./src/graphql/adapters/member.ts",
                    },
                    superAdmin: {
                        path: "/api/graphql/super-admin",
                        adapter: "./src/graphql/adapters/super-admin.ts",
                    },
                },
            },
            sse: {
                endpoints: {
                    public: {
                        path: "/api/sse/public",
                        adapter: "./src/sse/adapters/public.ts",
                    },
                },
            },
            superAdmin: {
                path: "/super-admin",
                adapter: "./src/spa/super-admin/adapter.ts",
                disabledBuiltinRouteIds: [
                    "queue.dashboard",
                    "queue.schedules",
                    "queue.jobs.recent",
                    "queue.jobs.active",
                    "queue.jobs.completed",
                    "queue.jobs.failed",
                    "queue.jobs.waiting",
                ],
                graphqlEndpoint: "superAdmin",
                websocketEndpoint: "superAdmin",
            },
            websocket: {
                endpoints: {
                    public: {
                        path: "/api/websocket/public",
                        adapter: "./src/websocket/adapters/public.ts",
                    },
                    member: {
                        path: "/api/websocket/member",
                        adapter: "./src/websocket/adapters/member.ts",
                    },
                    superAdmin: {
                        path: "/api/websocket/super-admin",
                        adapter: "./src/websocket/adapters/super-admin.ts",
                    },
                },
            },
        }),
    ],
    vite: {
        build: {
            sourcemap: "hidden",
        },
        plugins: [tailwindcss()],
    },
});
