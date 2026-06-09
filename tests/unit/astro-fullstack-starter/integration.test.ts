import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { EventEmitter } from "node:events";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeAstroFullstackStarterConfig } from "@shanjing/astro-full-stack-starter/config";
import { createGraphQLSetup } from "@shanjing/astro-full-stack-starter/graphql";
import {
    betterAuthAdminPlugin,
    appendAuthCookies,
    createDashboardMiddleware,
    defineDashboardAuthAdapter,
    roleAuthPlugin,
} from "@shanjing/astro-full-stack-starter/dashboard";
import {
    getEnabledAstroFullstackStarterSetups,
    runAstroFullstackStarterSetup,
    type AstroFullstackStarterSetup,
    type AstroFullstackStarterSetupContext,
} from "@shanjing/astro-full-stack-starter/setup";
import { createWebSocketSetup } from "@shanjing/astro-full-stack-starter/websocket";
import { astroFullstackStarter } from "@shanjing/astro-full-stack-starter/integration";
import {
    onRequest as webSocketDevMiddleware,
    setupWebSocketDevServer,
    websocketDevLocals,
    websocketUpgradeRequestStorage,
} from "@shanjing/astro-full-stack-starter/websocket/platforms/vite";
import {
    createDashboardRouteRegistry,
    createDashboardNavMain,
    defineDashboardRoutes,
    getDashboardRouteMeta,
    getDashboardRouteMetas,
    toDashboardRoutePath,
} from "@shanjing/astro-full-stack-starter/dashboard/client";
import { memberRoutes } from "@/dashboards/member/routes";
import { adminRoutes } from "@/dashboards/admin/routes";

import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";

describe("starter package Astro integration", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("keeps the demo Astro config wired to the starter integration", () => {
        const astroConfigPath = fileURLToPath(
            new URL("../../../astro.config.mjs", import.meta.url)
        );
        const middlewarePath = fileURLToPath(
            new URL("../../../src/middleware.ts", import.meta.url)
        );
        const dashboardAuthPath = fileURLToPath(
            new URL("../../../src/dashboards/auth.ts", import.meta.url)
        );
        const memberSchemaPath = fileURLToPath(
            new URL("../../../src/graphql/schemas/member.ts", import.meta.url)
        );
        const installPath = fileURLToPath(
            new URL(
                "../../../src/pages/replace-with-your-admin-path/install.astro",
                import.meta.url
            )
        );
        const loginPath = fileURLToPath(
            new URL("../../../src/pages/replace-with-your-admin-path/login.astro", import.meta.url)
        );
        const memberLoginPath = fileURLToPath(
            new URL("../../../src/pages/member/login.astro", import.meta.url)
        );
        const logoutPath = fileURLToPath(
            new URL("../../../src/pages/replace-with-your-admin-path/logout.astro", import.meta.url)
        );
        const astroConfig = readFileSync(astroConfigPath, "utf8");
        const middleware = readFileSync(middlewarePath, "utf8");
        const dashboardAuth = readFileSync(dashboardAuthPath, "utf8");
        const memberSchema = readFileSync(memberSchemaPath, "utf8");

        expect(astroConfig).toContain(
            'import astroFullstackStarter from "@shanjing/astro-full-stack-starter/integration";'
        );
        expect(astroConfig).toContain("astroFullstackStarter({");
        expect(astroConfig).toContain('adapter: "./src/graphql/adapters/member.ts"');
        expect(astroConfig).toContain('adapter: "./src/graphql/adapters/admin.ts"');
        expect(astroConfig).toContain('auth: "./src/dashboards/auth.ts"');
        expect(astroConfig).toContain('app: "./src/dashboards/admin/app.tsx"');
        expect(astroConfig).toContain('app: "./src/dashboards/member/app.tsx"');
        expect(astroConfig).toContain('path: "/replace-with-your-admin-path"');
        expect(astroConfig).toContain('path: "/member"');
        expect(astroConfig).toContain('graphqlEndpoint: "admin"');
        expect(astroConfig).toContain('graphqlEndpoint: "member"');
        expect(astroConfig).toContain('adapter: "./src/websocket/adapters/public.ts"');
        expect(astroConfig).toContain('adapter: "./src/websocket/adapters/admin.ts"');
        expect(middleware).not.toContain("@/middleware/admin");
        expect(dashboardAuth).toContain("betterAuthAdminPlugin");
        expect(dashboardAuth).not.toContain("roleAuthPlugin");
        expect(memberSchema).toContain("registerDashboardCurrentUserGraphQLSchema");
        expect(memberSchema).toContain("registerListOrdersQuery");
        expect(memberSchema).toContain("registerListProductsQuery");
        expect(memberSchema).toContain("registerListShopsQuery");
        expect(memberSchema).not.toContain("registerCreateOrderMutation");
        expect(memberSchema).not.toContain("registerDeleteOrderMutation");
        expect(memberSchema).not.toContain("registerUpdateOrderMutation");
        expect(memberSchema).not.toContain("registerCreateProductMutation");
        expect(memberSchema).not.toContain("registerDeleteProductMutation");
        expect(memberSchema).not.toContain("registerUpdateProductMutation");
        expect(existsSync(installPath)).toBe(true);
        expect(existsSync(loginPath)).toBe(true);
        expect(readFileSync(memberLoginPath, "utf8")).toContain('action="/member/login"');
        expect(readFileSync(memberLoginPath, "utf8")).toContain(
            'headers.set("location", "/member")'
        );
        expect(existsSync(logoutPath)).toBe(true);
    });

    it("normalizes empty config into disabled integration setups with defaults", () => {
        const config = normalizeAstroFullstackStarterConfig();

        expect(config.graphql).toEqual({
            enabled: false,
            endpoints: {},
        });
        expect(config.queue).toEqual({
            enabled: false,
        });
        expect(config.dashboard).toEqual({
            auth: null,
            enabled: false,
            instances: {},
        });
        expect(config.websocket).toEqual({
            devBridge: false,
            enabled: false,
            endpoints: {},
        });
    });

    it("normalizes enabled integration objects and explicit disabled objects", () => {
        const config = normalizeAstroFullstackStarterConfig({
            graphql: {
                endpoints: {
                    member: {
                        path: "/api/graphql/member",
                        adapter: "./src/graphql/adapters/member.ts",
                    },
                },
            },
            queue: {
                enabled: false,
            },
            dashboard: {
                auth: "./src/dashboards/auth.ts",
                instances: {
                    admin: {
                        app: "./src/dashboards/admin/app.tsx",
                        graphqlEndpoint: "admin",
                        path: "/replace-with-your-admin-path",
                        publicAuthRoutes: ["login", "install"],
                        requirePermission: {
                            dashboard: ["access:admin"],
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
                },
            },
        });

        expect(config.graphql.enabled).toBe(true);
        expect(config.graphql.endpoints.member).toEqual({
            path: "/api/graphql/member",
            adapter: "./src/graphql/adapters/member.ts",
        });
        expect(config.queue.enabled).toBe(false);
        expect(config.dashboard).toEqual({
            auth: "./src/dashboards/auth.ts",
            enabled: true,
            instances: {
                admin: {
                    app: "./src/dashboards/admin/app.tsx",
                    graphqlEndpoint: "admin",
                    id: "admin",
                    path: "/replace-with-your-admin-path",
                    publicAuthRoutes: ["login", "install"],
                    requirePermission: {
                        dashboard: ["access:admin"],
                    },
                    title: "admin",
                    websocketEndpoint: null,
                },
            },
        });
        expect(config.websocket).toEqual({
            devBridge: true,
            enabled: true,
            endpoints: {
                public: {
                    path: "/api/websocket/public",
                    adapter: "./src/websocket/adapters/public.ts",
                },
            },
        });
    });

    it("returns enabled setups in dependency order", () => {
        const config = normalizeAstroFullstackStarterConfig({
            graphql: {
                endpoints: {
                    admin: {
                        path: "/api/graphql/admin",
                        adapter: "./src/graphql/adapters/admin.ts",
                    },
                },
            },
            queue: {
                enabled: true,
            },
            dashboard: {
                auth: "./src/dashboards/auth.ts",
                instances: {
                    admin: {
                        app: "./src/dashboards/admin/app.tsx",
                        graphqlEndpoint: "admin",
                        path: "/replace-with-your-admin-path",
                        requirePermission: {
                            dashboard: ["access:admin"],
                        },
                        websocketEndpoint: "admin",
                    },
                },
            },
            websocket: {
                endpoints: {
                    admin: {
                        path: "/api/websocket/admin",
                        adapter: "./src/websocket/adapters/admin.ts",
                    },
                },
            },
        });

        const setups = getEnabledAstroFullstackStarterSetups(config);

        expect(setups.map((setup) => setup.name)).toEqual([
            "runtime",
            "graphql",
            "queue",
            "websocket",
            "dashboard",
        ]);
    });

    it("runs setups sequentially", async () => {
        const callOrder: string[] = [];
        const starterConfig = normalizeAstroFullstackStarterConfig();
        const context = {
            starterConfig,
        } as AstroFullstackStarterSetupContext;
        const setups: AstroFullstackStarterSetup[] = [
            {
                name: "runtime",
                setup() {
                    callOrder.push("runtime");
                },
            },
            {
                name: "graphql",
                async setup() {
                    await Promise.resolve();
                    callOrder.push("graphql");
                },
            },
            {
                name: "queue",
                setup() {
                    callOrder.push("queue");
                },
            },
        ];

        await runAstroFullstackStarterSetup(setups, context);

        expect(callOrder).toEqual(["runtime", "graphql", "queue"]);
    });

    it("rejects non-camelCase GraphQL endpoint names", () => {
        const setup = createGraphQLSetup({
            enabled: true,
            endpoints: {
                "admin-dashboard": {
                    path: "/api/graphql/admin",
                    adapter: "./src/graphql/adapters/admin.ts",
                },
            },
        });

        expect(() => setup.setup({} as AstroFullstackStarterSetupContext)).toThrow(
            'GraphQL endpoint name "admin-dashboard" must be camelCase'
        );
    });

    it("rejects duplicated WebSocket endpoint names before codegen", () => {
        const endpoint = {
            path: "/api/websocket/member",
            adapter: "./src/websocket/adapters/member.ts",
        };
        vi.spyOn(Object, "entries").mockReturnValueOnce([
            ["member", endpoint],
            ["member", endpoint],
        ]);

        const setup = createWebSocketSetup({
            devBridge: true,
            enabled: true,
            endpoints: {
                member: endpoint,
            },
        });

        expect(() => setup.setup({} as AstroFullstackStarterSetupContext)).toThrow(
            'WebSocket endpoint name "member" is duplicated.'
        );
    });

    it("rejects GraphQL endpoints with missing path", () => {
        const setup = createGraphQLSetup({
            enabled: true,
            endpoints: {
                member: {
                    adapter: "./src/graphql/adapters/member.ts",
                } as { adapter: string; path: string },
            },
        });

        expect(() => setup.setup({} as AstroFullstackStarterSetupContext)).toThrow(
            'GraphQL endpoint "member" requires a non-empty path.'
        );
    });

    it("generates GraphQL entrypoints with package batching defaults and adapter overrides", () => {
        const projectRoot = new URL("../../../", import.meta.url);
        const codegenParent = new URL(".astro/", projectRoot);
        mkdirSync(codegenParent, {
            recursive: true,
        });
        const codegenRoot = mkdtempSync(fileURLToPath(new URL("starter-graphql-", codegenParent)));
        const injectedRoutes: Parameters<AstroFullstackStarterSetupContext["injectRoute"]>[0][] =
            [];
        const setup = createGraphQLSetup({
            enabled: true,
            endpoints: {
                member: {
                    path: "/api/graphql/member",
                    adapter: "./src/graphql/adapters/member.ts",
                },
            },
        });

        try {
            setup.setup({
                config: {
                    root: projectRoot,
                },
                createCodegenDir() {
                    return pathToFileURL(`${codegenRoot}/`);
                },
                injectRoute(route) {
                    injectedRoutes.push(route);
                },
            } as AstroFullstackStarterSetupContext);

            expect(injectedRoutes).toEqual([
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/graphql-member.mjs`),
                    pattern: "/api/graphql/member",
                    prerender: false,
                },
            ]);
            expect(readFileSync(injectedRoutes[0].entrypoint as URL, "utf8")).toContain(
                'const defaultBatching = {"limit":10};\n' +
                    "\n" +
                    "const handleGraphQLRequest = createGraphQLYogaHandler({\n" +
                    "    ...adapter,\n" +
                    "    batching: adapter.batching ?? defaultBatching,\n" +
                    '    graphqlEndpoint: "/api/graphql/member",\n' +
                    "});\n"
            );
        } finally {
            rmSync(codegenRoot, {
                force: true,
                recursive: true,
            });
        }
    });

    it("rejects WebSocket endpoints with missing adapter", () => {
        const setup = createWebSocketSetup({
            devBridge: true,
            enabled: true,
            endpoints: {
                member: {
                    path: "/api/websocket/member",
                } as { adapter: string; path: string },
            },
        });

        expect(() => setup.setup({} as AstroFullstackStarterSetupContext)).toThrow(
            'WebSocket endpoint "member" requires a non-empty adapter.'
        );
    });

    it("generates WebSocket entrypoints with endpoint names from config keys", () => {
        const projectRoot = new URL("../../../", import.meta.url);
        const codegenParent = new URL(".astro/", projectRoot);
        mkdirSync(codegenParent, {
            recursive: true,
        });
        const codegenRoot = mkdtempSync(
            fileURLToPath(new URL("starter-websocket-", codegenParent))
        );
        const injectedRoutes: Parameters<AstroFullstackStarterSetupContext["injectRoute"]>[0][] =
            [];

        try {
            const setup = createWebSocketSetup({
                devBridge: true,
                enabled: true,
                endpoints: {
                    admin: {
                        path: "/api/websocket/admin",
                        adapter: "./src/websocket/adapters/admin.ts",
                    },
                },
            });

            setup.setup({
                config: {
                    root: projectRoot,
                },
                createCodegenDir() {
                    return pathToFileURL(`${codegenRoot}/`);
                },
                injectRoute(route) {
                    injectedRoutes.push(route);
                },
            } as AstroFullstackStarterSetupContext);

            expect(injectedRoutes).toEqual([
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/websocket-admin.mjs`),
                    pattern: "/api/websocket/admin",
                    prerender: false,
                },
            ]);
            expect(injectedRoutes[0].entrypoint).toBeInstanceOf(URL);
            expect(readFileSync(injectedRoutes[0].entrypoint as URL, "utf8")).toContain(
                'import { createWebSocketEndpointAdapterRoute } from "@shanjing/astro-full-stack-starter/websocket/adapter";\n' +
                    'import { adapter } from "../../src/websocket/adapters/admin.ts";\n' +
                    "\n" +
                    "export const GET = createWebSocketEndpointAdapterRoute({\n" +
                    "    adapter,\n" +
                    '    name: "admin",\n' +
                    "});\n"
            );
        } finally {
            rmSync(codegenRoot, {
                force: true,
                recursive: true,
            });
        }
    });

    it("rejects dashboard setup without shared auth", async () => {
        const integration = astroFullstackStarter({
            dashboard: {
                auth: "",
                instances: {
                    admin: {
                        app: "./src/dashboards/admin/app.tsx",
                        graphqlEndpoint: "admin",
                        path: "/replace-with-your-admin-path",
                        requirePermission: {
                            dashboard: ["access:admin"],
                        },
                    },
                },
            },
        });

        await expect(
            integration.hooks["astro:config:setup"]?.({
                config: {
                    root: new URL("../../../", import.meta.url),
                },
            } as AstroFullstackStarterSetupContext)
        ).rejects.toThrow("Dashboard integration requires a non-empty auth.");
    });

    it("rejects dashboard endpoint references that are not declared", async () => {
        const integration = astroFullstackStarter({
            dashboard: {
                auth: "./src/dashboards/auth.ts",
                instances: {
                    admin: {
                        app: "./src/dashboards/admin/app.tsx",
                        graphqlEndpoint: "admin",
                        path: "/replace-with-your-admin-path",
                        requirePermission: {
                            dashboard: ["access:admin"],
                        },
                    },
                },
            },
        });

        await expect(
            integration.hooks["astro:config:setup"]?.({
                config: {
                    root: new URL("../../../", import.meta.url),
                },
            } as AstroFullstackStarterSetupContext)
        ).rejects.toThrow(
            'Dashboard GraphQL endpoint "admin" must reference an enabled GraphQL endpoint.'
        );
    });

    it("pins React dev runtime during dashboard dev dependency optimization", async () => {
        const projectRoot = new URL("../../../", import.meta.url);
        const codegenParent = new URL(".astro/", projectRoot);
        mkdirSync(codegenParent, {
            recursive: true,
        });
        const codegenRoot = mkdtempSync(
            fileURLToPath(new URL("starter-dashboard-dev-runtime-", codegenParent))
        );
        const configUpdates: unknown[] = [];
        const integration = astroFullstackStarter({
            graphql: {
                endpoints: {
                    admin: {
                        path: "/api/graphql/admin",
                        adapter: "./src/graphql/adapters/admin.ts",
                    },
                },
            },
            dashboard: {
                auth: "./src/dashboards/auth.ts",
                instances: {
                    admin: {
                        app: "./src/dashboards/admin/app.tsx",
                        graphqlEndpoint: "admin",
                        path: "/replace-with-your-admin-path",
                        requirePermission: {
                            dashboard: ["access:admin"],
                        },
                    },
                },
            },
        });

        try {
            await expect(
                integration.hooks["astro:config:setup"]?.({
                    command: "dev",
                    config: {
                        root: projectRoot,
                    },
                    createCodegenDir() {
                        return pathToFileURL(`${codegenRoot}/`);
                    },
                    addMiddleware() {},
                    injectRoute() {},
                    updateConfig(configUpdate: unknown) {
                        configUpdates.push(configUpdate);
                        return {} as never;
                    },
                } as unknown as AstroFullstackStarterSetupContext)
            ).resolves.toBeUndefined();
            expect(configUpdates).toContainEqual({
                vite: {
                    optimizeDeps: {
                        force: true,
                        esbuildOptions: {
                            define: {
                                "process.env.NODE_ENV": '"development"',
                            },
                        },
                    },
                },
            });
        } finally {
            rmSync(codegenRoot, {
                force: true,
                recursive: true,
            });
        }
    });

    it("injects WebSocket dev middleware when WebSocket endpoints are enabled in dev", async () => {
        const projectRoot = new URL("../../../", import.meta.url);
        const codegenParent = new URL(".astro/", projectRoot);
        mkdirSync(codegenParent, {
            recursive: true,
        });
        const codegenRoot = mkdtempSync(
            fileURLToPath(new URL("starter-websocket-dev-", codegenParent))
        );
        const middlewareEntrypoints: Parameters<
            AstroFullstackStarterSetupContext["addMiddleware"]
        >[0][] = [];
        const integration = astroFullstackStarter({
            websocket: {
                endpoints: {
                    public: {
                        path: "/api/websocket/public",
                        adapter: "./src/websocket/adapters/public.ts",
                    },
                },
            },
        });

        try {
            await expect(
                integration.hooks["astro:config:setup"]?.({
                    command: "dev",
                    config: {
                        root: projectRoot,
                    },
                    createCodegenDir() {
                        return pathToFileURL(`${codegenRoot}/`);
                    },
                    addMiddleware(
                        middleware: Parameters<
                            AstroFullstackStarterSetupContext["addMiddleware"]
                        >[0]
                    ) {
                        middlewareEntrypoints.push(middleware);
                    },
                    injectRoute() {},
                    updateConfig() {
                        return {} as never;
                    },
                } as unknown as AstroFullstackStarterSetupContext)
            ).resolves.toBeUndefined();

            expect(middlewareEntrypoints).toContainEqual({
                entrypoint: expect.objectContaining({
                    pathname: expect.stringContaining("/websocket/platforms/vite/middleware.js"),
                }),
                order: "pre",
            });
        } finally {
            rmSync(codegenRoot, {
                force: true,
                recursive: true,
            });
        }
    });

    it("skips WebSocket dev middleware when dev bridge is disabled", async () => {
        const projectRoot = new URL("../../../", import.meta.url);
        const codegenParent = new URL(".astro/", projectRoot);
        mkdirSync(codegenParent, {
            recursive: true,
        });
        const codegenRoot = mkdtempSync(
            fileURLToPath(new URL("starter-websocket-dev-disabled-", codegenParent))
        );
        const middlewareEntrypoints: Parameters<
            AstroFullstackStarterSetupContext["addMiddleware"]
        >[0][] = [];
        const integration = astroFullstackStarter({
            websocket: {
                devBridge: false,
                endpoints: {
                    public: {
                        path: "/api/websocket/public",
                        adapter: "./src/websocket/adapters/public.ts",
                    },
                },
            },
        });

        try {
            await expect(
                integration.hooks["astro:config:setup"]?.({
                    command: "dev",
                    config: {
                        root: projectRoot,
                    },
                    createCodegenDir() {
                        return pathToFileURL(`${codegenRoot}/`);
                    },
                    addMiddleware(
                        middleware: Parameters<
                            AstroFullstackStarterSetupContext["addMiddleware"]
                        >[0]
                    ) {
                        middlewareEntrypoints.push(middleware);
                    },
                    injectRoute() {},
                    updateConfig() {
                        return {} as never;
                    },
                } as unknown as AstroFullstackStarterSetupContext)
            ).resolves.toBeUndefined();

            expect(middlewareEntrypoints).toEqual([]);
        } finally {
            rmSync(codegenRoot, {
                force: true,
                recursive: true,
            });
        }
    });

    it("passes unrelated WebSocket upgrades through the dev server bridge", () => {
        const handledPaths: string[] = [];
        function astroDevHandler(request: IncomingMessage) {
            handledPaths.push(request.url ?? "");
        }
        const httpServer = new EventEmitter();
        const viteDevServer = {
            httpServer,
            middlewares: {
                stack: [
                    {
                        handle: astroDevHandler,
                    },
                ],
            },
        } as unknown as Parameters<typeof setupWebSocketDevServer>[0];
        const socket = {
            end() {},
            write() {
                return true;
            },
        } as unknown as Socket;

        setupWebSocketDevServer(viteDevServer, {
            endpointPaths: ["/api/websocket/public"],
        });
        httpServer.emit(
            "upgrade",
            {
                headers: {
                    host: "localhost:4321",
                },
                url: "/custom/ws",
            } as IncomingMessage,
            socket,
            Buffer.alloc(0)
        );
        httpServer.emit(
            "upgrade",
            {
                headers: {
                    host: "localhost:4321",
                },
                url: "/api/websocket/public",
            } as IncomingMessage,
            socket,
            Buffer.alloc(0)
        );

        expect(handledPaths).toEqual(["/api/websocket/public"]);
    });

    it("writes rejected WebSocket dev responses to the upgrade socket", async () => {
        const socketWrites: string[] = [];
        const socket = {
            end() {},
            write(chunk: string | Buffer) {
                socketWrites.push(String(chunk));
                return true;
            },
        } as unknown as Socket;
        const context = {
            locals: {},
        } as Parameters<typeof webSocketDevMiddleware>[0];

        const response = await websocketUpgradeRequestStorage.run(
            [{} as IncomingMessage, socket, Buffer.alloc(0)],
            () =>
                webSocketDevMiddleware(context, async () => {
                    return new Response("Forbidden", {
                        status: 403,
                    });
                })
        );

        expect(socketWrites.join("")).toContain("HTTP/1.1 403 Forbidden");
        expect(socketWrites.join("")).toContain("Forbidden");
        await expect(response?.text()).resolves.toBe("Forbidden");
    });

    it("exposes WebSocket dev locals to routes during upgrade requests", async () => {
        const socket = {
            end() {},
            write() {
                return true;
            },
        } as unknown as Socket;
        const context = {
            locals: {},
        } as Parameters<typeof webSocketDevMiddleware>[0];

        await websocketUpgradeRequestStorage.run(
            [{} as IncomingMessage, socket, Buffer.alloc(0)],
            () =>
                webSocketDevMiddleware(context, async () => {
                    expect(context.locals).toMatchObject({
                        isUpgradeRequest: true,
                    });
                    expect(typeof context.locals.upgradeWebSocket).toBe("function");

                    return new Response(null, {
                        status: 403,
                    });
                })
        );
    });

    it("upgrades WebSocket dev responses after Astro middleware returns the upgrade response", async () => {
        const socketWrites: string[] = [];
        const socket = Object.assign(new EventEmitter(), {
            destroyed: false,
            end() {},
            write(chunk: string | Buffer) {
                socketWrites.push(String(chunk));
                return true;
            },
        }) as unknown as Socket;
        const request = {
            headers: {
                host: "localhost:4321",
                "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
            },
            socket,
            url: "/api/websocket/public",
        } as unknown as IncomingMessage;
        const context = {
            locals: {},
        } as Parameters<typeof webSocketDevMiddleware>[0];

        await websocketUpgradeRequestStorage.run([request, socket, Buffer.alloc(0)], () =>
            webSocketDevMiddleware(context, async () => {
                const { response } = websocketDevLocals.upgradeWebSocket();

                return response;
            })
        );

        expect(socketWrites.join("")).toContain("HTTP/1.1 101 Switching Protocols");
        expect(socketWrites.join("")).toContain(
            "Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo="
        );
    });

    it("allows dashboard setup without a WebSocket endpoint reference", async () => {
        const projectRoot = new URL("../../../", import.meta.url);
        const codegenParent = new URL(".astro/", projectRoot);
        mkdirSync(codegenParent, {
            recursive: true,
        });
        const codegenRoot = mkdtempSync(
            fileURLToPath(new URL("starter-dashboard-", codegenParent))
        );
        const middlewareEntrypoints: Parameters<
            AstroFullstackStarterSetupContext["addMiddleware"]
        >[0][] = [];
        const injectedRoutes: Parameters<AstroFullstackStarterSetupContext["injectRoute"]>[0][] =
            [];
        const integration = astroFullstackStarter({
            graphql: {
                endpoints: {
                    admin: {
                        path: "/api/graphql/admin",
                        adapter: "./src/graphql/adapters/admin.ts",
                    },
                },
            },
            dashboard: {
                auth: "./src/dashboards/auth.ts",
                instances: {
                    admin: {
                        app: "./src/dashboards/admin/app.tsx",
                        graphqlEndpoint: "admin",
                        path: "/replace-with-your-admin-path",
                        publicAuthRoutes: ["login", "install"],
                        requirePermission: {
                            dashboard: ["access:admin"],
                        },
                        title: "Admin",
                    },
                },
            },
        });

        try {
            await expect(
                integration.hooks["astro:config:setup"]?.({
                    config: {
                        root: projectRoot,
                    },
                    createCodegenDir() {
                        return pathToFileURL(`${codegenRoot}/`);
                    },
                    addMiddleware(
                        middleware: Parameters<
                            AstroFullstackStarterSetupContext["addMiddleware"]
                        >[0]
                    ) {
                        middlewareEntrypoints.push(middleware);
                    },
                    injectRoute(
                        route: Parameters<AstroFullstackStarterSetupContext["injectRoute"]>[0]
                    ) {
                        injectedRoutes.push(route);
                    },
                } as unknown as AstroFullstackStarterSetupContext)
            ).resolves.toBeUndefined();
            expect(injectedRoutes).toEqual([
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/graphql-admin.mjs`),
                    pattern: "/api/graphql/admin",
                    prerender: false,
                },
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/dashboard-admin-app.astro`),
                    pattern: "/replace-with-your-admin-path",
                    prerender: false,
                },
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/dashboard-admin-app.astro`),
                    pattern: "/replace-with-your-admin-path/[...slug]",
                    prerender: false,
                },
            ]);
            expect(middlewareEntrypoints).toEqual([
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/dashboard-middleware.mjs`),
                    order: "post",
                },
            ]);
            expect(readFileSync(middlewareEntrypoints[0].entrypoint as URL, "utf8")).toContain(
                'import { createDashboardMiddleware } from "@shanjing/astro-full-stack-starter/dashboard";\n' +
                    'import auth from "../../src/dashboards/auth.ts";\n' +
                    "\n" +
                    "export const onRequest = createDashboardMiddleware({\n" +
                    "    auth,\n" +
                    '    dashboards: [{"graphqlPath":"/api/graphql/admin","id":"admin","path":"/replace-with-your-admin-path","publicAuthRoutes":["login","install"],"requirePermission":{"dashboard":["access:admin"]},"websocketPath":null}],\n' +
                    "});\n"
            );
            expect(
                readFileSync(pathToFileURL(`${codegenRoot}/dashboard-admin-app.astro`), "utf8")
            ).toContain(
                `import "../../src/styles/global.css";\n` +
                    'import DashboardApp from "../../src/dashboards/admin/app.tsx";\n' +
                    "\n" +
                    'const pageTitle = "Admin";'
            );
            expect(
                readFileSync(pathToFileURL(`${codegenRoot}/dashboard-admin-app.astro`), "utf8")
            ).toContain(
                '<DashboardApp dashboardId="admin" title="Admin" basePath="/replace-with-your-admin-path" graphqlPath="/api/graphql/admin" client:only="react" />'
            );
            expect(
                readFileSync(pathToFileURL(`${codegenRoot}/dashboard-admin-app.astro`), "utf8")
            ).toContain('const themeStorageKey = "dashboard:admin:theme";');
            expect(
                readFileSync(pathToFileURL(`${codegenRoot}/dashboard-admin-app.astro`), "utf8")
            ).toContain('const fontSizeCookiePrefix = "dashboard-admin-font-size=";');
        } finally {
            rmSync(codegenRoot, {
                force: true,
                recursive: true,
            });
        }
    });

    it("defines project-owned admin auth and routes", () => {
        const auth = defineDashboardAuthAdapter({
            async getSession() {
                return {
                    session: {},
                    user: {
                        id: 1,
                        role: "admin",
                    },
                };
            },
            async hasPermission() {
                return {
                    allowed: true,
                };
            },
        });

        expect(auth).toBeDefined();

        const routes = defineDashboardRoutes([
            {
                component: "ShopListPage",
                id: "shop.list",
                path: "/shop/list",
                title: "店铺",
            },
        ]);
        const registry = createDashboardRouteRegistry(
            [
                {
                    component: "DashboardPage",
                    id: "dashboard",
                    path: "/",
                    title: "Dashboard",
                },
            ],
            routes
        );

        expect(registry.routes.map((route) => route.id)).toEqual(["dashboard", "shop.list"]);
    });

    it("registers demo business pages as project-owned dashboard routes", () => {
        const businessRouteIds = ["project.dashboard", "shop.list", "product.list", "order.list"];

        expect(
            adminRoutes
                .filter((route) => businessRouteIds.includes(route.id))
                .map((route) => ({
                    id: route.id,
                    path: route.path,
                    permission: route.permission,
                }))
        ).toEqual([
            {
                id: "project.dashboard",
                path: "/",
                permission: {
                    dashboard: ["access:admin"],
                },
            },
            {
                id: "shop.list",
                path: "/shop/list",
                permission: {
                    shop: ["list"],
                },
            },
            {
                id: "product.list",
                path: "/product/list",
                permission: {
                    product: ["list"],
                },
            },
            {
                id: "order.list",
                path: "/order/list",
                permission: {
                    order: ["list"],
                },
            },
        ]);
    });

    it("registers queue routes only in the admin dashboard", () => {
        expect(adminRoutes.map((route) => route.id)).toEqual(
            expect.arrayContaining([
                "queue.dashboard",
                "queue.schedules",
                "queue.jobs.failed",
                "queue.jobs.status",
                "queue.jobs.detail",
            ])
        );
        expect(adminRoutes.map((route) => route.path)).toEqual(
            expect.arrayContaining([
                "/queues",
                "/queues/schedules",
                "/queues/jobs/failed",
                "/queues/jobs/:status",
                "/queues/jobs/:status/:recordId",
            ])
        );
        expect(memberRoutes.map((route) => route.id)).not.toContain("queue.dashboard");
    });

    it("registers user routes only in the admin dashboard", () => {
        expect(adminRoutes.map((route) => route.id)).toEqual(
            expect.arrayContaining(["user.list", "user.admin"])
        );
        expect(adminRoutes.map((route) => route.path)).toEqual(
            expect.arrayContaining(["/user/list", "/user/admin"])
        );
        expect(memberRoutes.map((route) => route.id)).not.toContain("user.list");
    });

    it("registers read-only business pages in the member dashboard", () => {
        expect(
            memberRoutes.map((route) => ({
                id: route.id,
                path: route.path,
                permission: route.permission,
            }))
        ).toEqual(
            expect.arrayContaining([
                {
                    id: "member.shop.list",
                    path: "/shop/list",
                    permission: {
                        shop: ["list"],
                    },
                },
                {
                    id: "member.product.list",
                    path: "/product/list",
                    permission: {
                        product: ["list"],
                    },
                },
                {
                    id: "member.order.list",
                    path: "/order/list",
                    permission: {
                        order: ["list"],
                    },
                },
            ])
        );
    });

    it("lets project-owned routes replace package-owned routes by path", () => {
        const registry = createDashboardRouteRegistry(
            [
                {
                    id: "dashboard",
                    path: "/",
                    title: "Dashboard",
                },
                {
                    id: "queue.dashboard",
                    path: "/queues",
                    title: "Queues",
                },
            ],
            [
                {
                    component: "ProjectDashboardPage",
                    id: "project.dashboard",
                    path: "/",
                    title: "Project Dashboard",
                },
            ]
        );

        expect(registry.routes.find((route) => route.path === "/")?.id).toBe("project.dashboard");
        expect(registry.routes.map((route) => route.id)).not.toContain("dashboard");
    });

    it("derives demo business navigation from project-owned dashboard routes", () => {
        expect(
            createDashboardNavMain("/admin", adminRoutes).map((item) => ({
                title: item.title,
                url: item.url,
            }))
        ).toEqual(
            expect.arrayContaining([
                {
                    title: "Dashboard",
                    url: "/admin",
                },
                {
                    title: "店铺",
                    url: "/admin/shop/list",
                },
                {
                    title: "商品",
                    url: "/admin/product/list",
                },
                {
                    title: "订单",
                    url: "/admin/order/list",
                },
                {
                    title: "用户",
                    url: "/admin/user/list",
                },
            ])
        );
        expect(
            getDashboardRouteMetas("/admin", adminRoutes).map((routeMeta) => routeMeta.url)
        ).toEqual(
            expect.arrayContaining([
                "/admin/shop/list",
                "/admin/product/list",
                "/admin/order/list",
                "/admin/user/list",
            ])
        );
        expect(
            createDashboardNavMain("/console", adminRoutes).map((item) => ({
                title: item.title,
                url: item.url,
            }))
        ).toEqual(
            expect.arrayContaining([
                {
                    title: "店铺",
                    url: "/console/shop/list",
                },
                {
                    title: "商品",
                    url: "/console/product/list",
                },
                {
                    title: "订单",
                    url: "/console/order/list",
                },
            ])
        );
        expect(
            getDashboardRouteMetas("/console", adminRoutes).map((routeMeta) => routeMeta.url)
        ).toEqual(
            expect.arrayContaining([
                "/console/shop/list",
                "/console/product/list",
                "/console/order/list",
            ])
        );
        expect(toDashboardRoutePath("/console/shop/list", "/console")).toBe("shop/list");
    });

    it("rejects duplicate dashboard project routes", () => {
        expect(() =>
            defineDashboardRoutes([
                {
                    component: "QueuePage",
                    id: "queue",
                    path: "/queues",
                    title: "Queues",
                },
                {
                    component: "OtherQueuePage",
                    id: "queue",
                    path: "/queues/other",
                    title: "Other Queues",
                },
            ])
        ).toThrow('Dashboard route id "queue" is duplicated.');
    });

    it("rejects duplicate browser-side dashboard project routes", () => {
        expect(() =>
            defineDashboardRoutes([
                {
                    component: "QueuePage",
                    id: "queue",
                    path: "/queues",
                    title: "Queues",
                },
                {
                    component: "OtherQueuePage",
                    id: "queue",
                    path: "/queues/other",
                    title: "Other Queues",
                },
            ])
        ).toThrow('Dashboard route id "queue" is duplicated.');
    });

    it("derives navigation from supplied package-owned dashboard routes", () => {
        const builtinRoutes = [
            {
                id: "queue.dashboard",
                path: "/queues",
                title: "控制台",
                nav: {
                    order: 99,
                    title: "队列",
                },
            },
            {
                id: "queue.schedules",
                path: "/queues/schedules",
                title: "队列计划",
                nav: {
                    order: 21,
                    parentId: "queue.dashboard",
                },
            },
            {
                id: "queue.jobs.failed",
                path: "/queues/jobs/failed",
                title: "失败任务",
                nav: {
                    order: 25,
                    parentId: "queue.dashboard",
                },
            },
        ];

        expect(
            getDashboardRouteMetas("/admin", [], builtinRoutes).map((route) => route.url)
        ).toEqual(
            expect.arrayContaining([
                "/admin/queues",
                "/admin/queues/schedules",
                "/admin/queues/jobs/failed",
            ])
        );
        expect(
            createDashboardNavMain("/admin", [], builtinRoutes).find(
                (route) => route.url === "/admin/queues"
            )?.title
        ).toBe("队列");
        expect(
            createDashboardNavMain("/admin", [], builtinRoutes)
                .find((route) => route.url === "/admin/queues")
                ?.items.map((item) => item.title)
        ).toEqual(expect.arrayContaining(["控制台", "队列计划", "失败任务"]));
    });

    it("uses the longest route prefix for dynamic admin child pages", () => {
        expect(
            getDashboardRouteMeta(
                "/admin/queues/jobs/failed/record-1",
                "/admin",
                [],
                [
                    {
                        id: "queue.dashboard",
                        path: "/queues",
                        title: "队列",
                        nav: {
                            order: 1,
                        },
                    },
                    {
                        id: "queue.jobs.failed",
                        path: "/queues/jobs/failed",
                        title: "失败任务",
                        nav: {
                            order: 2,
                            parentId: "queue.dashboard",
                        },
                    },
                ]
            )
        ).toEqual({
            parentTitle: "队列",
            title: "失败任务",
            url: "/admin/queues/jobs/failed",
        });
    });

    it("checks access with the role auth plugin", async () => {
        const auth = roleAuthPlugin({
            async getSession() {
                return {
                    session: {},
                    user: {
                        id: "1",
                        role: "admin",
                    },
                };
            },
        });
        const session = await auth.getSession({} as Parameters<typeof auth.getSession>[0]);
        const result = await auth.hasPermission({
            context: {} as Parameters<typeof auth.getSession>[0],
            dashboardId: "admin",
            permission: {
                dashboard: ["access:admin"],
            },
            routeId: "dashboard.access",
            session: session!,
        });

        expect(result).toEqual({
            allowed: true,
            reason: "role",
        });
    });

    it("bridges Better Auth admin permission checks", async () => {
        const userHasPermission = vi.fn(async () => ({
            success: true,
        }));
        const auth = betterAuthAdminPlugin({
            auth: {
                api: {
                    async getSession() {
                        return {
                            session: {},
                            user: {
                                id: "1",
                                role: "admin",
                            },
                        };
                    },
                    userHasPermission,
                },
            },
        });
        const request = new Request("https://example.com/replace-with-your-admin-path");
        const context = {
            request,
        } as Parameters<typeof auth.getSession>[0];
        const session = await auth.getSession(context);
        const result = await auth.hasPermission({
            context,
            dashboardId: "admin",
            permission: {
                dashboard: ["access:admin"],
            },
            routeId: "dashboard.access",
            session: session!,
        });

        expect(result).toEqual({
            allowed: true,
            reason: "better-auth-admin",
        });
        expect(userHasPermission).toHaveBeenCalledWith({
            body: {
                permissions: {
                    dashboard: ["access:admin"],
                },
                role: "admin",
                userId: "1",
            },
            headers: request.headers,
        });
    });

    it("copies Better Auth set-cookie headers into target responses", () => {
        const source = new Headers({
            "set-cookie": "session=abc; Path=/",
        });
        const target = new Headers();

        appendAuthCookies(source, target);

        expect(target.get("set-cookie")).toBe("session=abc; Path=/");
    });

    it("redirects unauthenticated admin page requests from package middleware", async () => {
        const onRequest = createDashboardMiddleware({
            auth: defineDashboardAuthAdapter({
                async getSession() {
                    return null;
                },
                async hasPermission() {
                    return {
                        allowed: false,
                    };
                },
            }),
            dashboards: [
                {
                    graphqlPath: "/api/graphql/admin",
                    id: "admin",
                    path: "/replace-with-your-admin-path",
                    publicAuthRoutes: [],
                    requirePermission: {
                        dashboard: ["access:admin"],
                    },
                    websocketPath: null,
                },
            ],
        });
        const response = await onRequest(
            {
                locals: {},
                request: new Request("https://example.com/replace-with-your-admin-path"),
                url: new URL("https://example.com/replace-with-your-admin-path"),
            } as Parameters<typeof onRequest>[0],
            async () => new Response("next")
        );
        const redirectResponse = response as Response;

        expect(redirectResponse.status).toBe(303);
        expect(redirectResponse.headers.get("location")).toBe(
            "https://example.com/replace-with-your-admin-path/login"
        );
    });

    it("returns GraphQL errors for unauthenticated admin GraphQL requests", async () => {
        const onRequest = createDashboardMiddleware({
            auth: defineDashboardAuthAdapter({
                async getSession() {
                    return null;
                },
                async hasPermission() {
                    return {
                        allowed: false,
                    };
                },
            }),
            dashboards: [
                {
                    graphqlPath: "/api/graphql/admin",
                    id: "admin",
                    path: "/replace-with-your-admin-path",
                    publicAuthRoutes: [],
                    requirePermission: {
                        dashboard: ["access:admin"],
                    },
                    websocketPath: null,
                },
            ],
        });
        const response = await onRequest(
            {
                locals: {},
                request: new Request("https://example.com/api/graphql/admin"),
                url: new URL("https://example.com/api/graphql/admin"),
            } as Parameters<typeof onRequest>[0],
            async () => new Response("next")
        );
        const graphQLResponse = response as Response;

        await expect(graphQLResponse.json()).resolves.toEqual({
            errors: [
                {
                    message:
                        "Dashboard session is required. Open https://example.com/replace-with-your-admin-path/login to sign in, then retry.",
                },
            ],
        });
        expect(graphQLResponse.status).toBe(401);
    });

    it("returns WebSocket unauthorized responses for unauthenticated admin WebSocket requests", async () => {
        const onRequest = createDashboardMiddleware({
            auth: defineDashboardAuthAdapter({
                async getSession() {
                    return null;
                },
                async hasPermission() {
                    return {
                        allowed: false,
                    };
                },
            }),
            dashboards: [
                {
                    graphqlPath: "/api/graphql/admin",
                    id: "admin",
                    path: "/replace-with-your-admin-path",
                    publicAuthRoutes: [],
                    requirePermission: {
                        dashboard: ["access:admin"],
                    },
                    websocketPath: "/api/websocket/admin",
                },
            ],
        });
        const response = await onRequest(
            {
                locals: {},
                request: new Request("https://example.com/api/websocket/admin"),
                url: new URL("https://example.com/api/websocket/admin"),
            } as Parameters<typeof onRequest>[0],
            async () => new Response("next")
        );
        const websocketResponse = response as Response;

        await expect(websocketResponse.text()).resolves.toBe(
            "Dashboard session is required. Open https://example.com/replace-with-your-admin-path/login to sign in, then retry."
        );
        expect(websocketResponse.status).toBe(401);
    });

    it("returns WebSocket forbidden responses for unauthorized admin WebSocket requests", async () => {
        const onRequest = createDashboardMiddleware({
            auth: defineDashboardAuthAdapter({
                async getSession() {
                    return {
                        session: {},
                        user: {
                            id: "1",
                            role: "member",
                        },
                    };
                },
                async hasPermission() {
                    return {
                        allowed: false,
                    };
                },
            }),
            dashboards: [
                {
                    graphqlPath: "/api/graphql/admin",
                    id: "admin",
                    path: "/replace-with-your-admin-path",
                    publicAuthRoutes: [],
                    requirePermission: {
                        dashboard: ["access:admin"],
                    },
                    websocketPath: "/api/websocket/admin",
                },
            ],
        });
        const response = await onRequest(
            {
                locals: {},
                request: new Request("https://example.com/api/websocket/admin"),
                url: new URL("https://example.com/api/websocket/admin"),
            } as Parameters<typeof onRequest>[0],
            async () => new Response("next")
        );
        const websocketResponse = response as Response;

        await expect(websocketResponse.text()).resolves.toBe("Dashboard access is required.");
        expect(websocketResponse.status).toBe(403);
    });

    it("creates an Astro integration with the package name and setup hook", () => {
        const integration = astroFullstackStarter({
            graphql: {
                enabled: true,
            },
        });

        expect(integration.name).toBe("@shanjing/astro-full-stack-starter");
        expect(integration.hooks["astro:config:setup"]).toEqual(expect.any(Function));
    });
});
