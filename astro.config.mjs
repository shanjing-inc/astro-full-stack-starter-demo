import { defineConfig, passthroughImageService } from "astro/config";
import react from "@astrojs/react";
import deno from "@deno/astro-adapter";
import sentry from "@sentry/astro";
import astroFullstackStarter from "@shanjing/astro-full-stack-starter/integration";
import tailwindcss from "@tailwindcss/vite";

const sentryDsn = process.env.SENTRY_DSN?.trim();

export default defineConfig({
    output: "server",
    outDir: "dist/deno",
    adapter: deno({
        start: false,
        // 补齐 adapter 0.6.0 虚拟配置导出；start: false 下监听由 serve.mjs 接管。
        hostname: undefined,
        port: undefined,
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
                    admin: {
                        path: "/api/graphql/admin",
                        adapter: "./src/graphql/adapters/admin.ts",
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
            dashboard: {
                auth: "./src/dashboards/auth.ts",
                instances: {
                    admin: {
                        title: "Admin",
                        path: "/replace-with-your-admin-path",
                        app: "./src/dashboards/admin/app.tsx",
                        graphqlEndpoint: "admin",
                        websocketEndpoint: "admin",
                        publicAuthRoutes: ["login", "install"],
                        requirePermission: {
                            dashboard: ["access:admin"],
                        },
                    },
                    member: {
                        title: "Member",
                        path: "/member",
                        app: "./src/dashboards/member/app.tsx",
                        graphqlEndpoint: "member",
                        websocketEndpoint: "member",
                        publicAuthRoutes: ["login"],
                        requirePermission: {
                            dashboard: ["access:member"],
                        },
                    },
                },
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
                    admin: {
                        path: "/api/websocket/admin",
                        adapter: "./src/websocket/adapters/admin.ts",
                    },
                },
            },
        }),
    ],
    vite: {
        server: {
            fs: {
                allow: ["../.."],
            },
        },
        build: {
            sourcemap: "hidden",
        },
        plugins: [tailwindcss()],
    },
});
