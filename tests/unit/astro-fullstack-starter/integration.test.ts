import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { EventEmitter } from "node:events";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeAstroFullstackStarterConfig } from "@shanjing/astro-full-stack-starter/config";
import { createGraphQLSetup } from "@shanjing/astro-full-stack-starter/graphql";
import {
    betterAuthAdminPlugin,
    appendAuthCookies,
    createSuperAdminMiddleware,
    defineSuperAdminAdapter,
    defineSuperAdminAuthPlugin,
    roleAuthPlugin,
} from "@shanjing/astro-full-stack-starter/super-admin";
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
    createSuperAdminRouteRegistry,
    createSuperAdminNavMain,
    defineSuperAdminRoutes,
    getSuperAdminRouteMeta,
    getSuperAdminRouteMetas,
    toSuperAdminRoutePath,
} from "@shanjing/astro-full-stack-starter/super-admin/client";
import { projectSuperAdminRoutes } from "@/spa/super-admin/routes";

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
        const superAdminAdapterPath = fileURLToPath(
            new URL("../../../src/spa/super-admin/adapter.ts", import.meta.url)
        );
        const installPath = fileURLToPath(
            new URL("../../../src/pages/super-admin/install.astro", import.meta.url)
        );
        const loginPath = fileURLToPath(
            new URL("../../../src/pages/super-admin/login.astro", import.meta.url)
        );
        const logoutPath = fileURLToPath(
            new URL("../../../src/pages/super-admin/logout.astro", import.meta.url)
        );
        const astroConfig = readFileSync(astroConfigPath, "utf8");
        const middleware = readFileSync(middlewarePath, "utf8");
        const superAdminAdapter = readFileSync(superAdminAdapterPath, "utf8");

        expect(astroConfig).toContain(
            'import astroFullstackStarter from "@shanjing/astro-full-stack-starter/integration";'
        );
        expect(astroConfig).toContain("astroFullstackStarter({");
        expect(astroConfig).toContain('adapter: "./src/graphql/adapters/member.ts"');
        expect(astroConfig).toContain('adapter: "./src/graphql/adapters/super-admin.ts"');
        expect(astroConfig).toContain('adapter: "./src/spa/super-admin/adapter.ts"');
        expect(astroConfig).toContain('path: "/super-admin"');
        expect(astroConfig).toContain('graphqlEndpoint: "superAdmin"');
        expect(astroConfig).toContain('adapter: "./src/websocket/adapters/public.ts"');
        expect(astroConfig).toContain('adapter: "./src/websocket/adapters/super-admin.ts"');
        expect(middleware).not.toContain("@/middleware/super-admin");
        expect(superAdminAdapter).toContain("betterAuthAdminPlugin");
        expect(superAdminAdapter).not.toContain("roleAuthPlugin");
        expect(existsSync(installPath)).toBe(true);
        expect(existsSync(loginPath)).toBe(true);
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
        expect(config.superAdmin).toEqual({
            adapter: null,
            disabledBuiltinRouteIds: [],
            enabled: false,
            path: "/super-admin",
            graphqlEndpoint: "superAdmin",
            websocketEndpoint: null,
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
            superAdmin: {
                adapter: "./src/spa/super-admin/adapter.ts",
                disabledBuiltinRouteIds: ["queue.dashboard"],
                path: "/admin",
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
        expect(config.superAdmin).toEqual({
            adapter: "./src/spa/super-admin/adapter.ts",
            disabledBuiltinRouteIds: ["queue.dashboard"],
            enabled: true,
            path: "/admin",
            graphqlEndpoint: "superAdmin",
            websocketEndpoint: null,
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
                    superAdmin: {
                        path: "/api/graphql/super-admin",
                        adapter: "./src/graphql/adapters/super-admin.ts",
                    },
                },
            },
            queue: {
                enabled: true,
            },
            superAdmin: {
                adapter: "./src/spa/super-admin/adapter.ts",
                websocketEndpoint: "superAdmin",
            },
            websocket: {
                endpoints: {
                    superAdmin: {
                        path: "/api/websocket/super-admin",
                        adapter: "./src/websocket/adapters/super-admin.ts",
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
            "superAdmin",
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
                "super-admin": {
                    path: "/api/graphql/super-admin",
                    adapter: "./src/graphql/adapters/super-admin.ts",
                },
            },
        });

        expect(() => setup.setup({} as AstroFullstackStarterSetupContext)).toThrow(
            'GraphQL endpoint name "super-admin" must be camelCase'
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
                    superAdmin: {
                        path: "/api/websocket/super-admin",
                        adapter: "./src/websocket/adapters/super-admin.ts",
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
                    entrypoint: pathToFileURL(`${codegenRoot}/websocket-superAdmin.mjs`),
                    pattern: "/api/websocket/super-admin",
                    prerender: false,
                },
            ]);
            expect(injectedRoutes[0].entrypoint).toBeInstanceOf(URL);
            expect(readFileSync(injectedRoutes[0].entrypoint as URL, "utf8")).toContain(
                'import { createWebSocketEndpointAdapterRoute } from "@shanjing/astro-full-stack-starter/websocket/adapter";\n' +
                    'import { adapter } from "../../src/websocket/adapters/super-admin.ts";\n' +
                    "\n" +
                    "export const GET = createWebSocketEndpointAdapterRoute({\n" +
                    "    adapter,\n" +
                    '    name: "superAdmin",\n' +
                    "});\n"
            );
        } finally {
            rmSync(codegenRoot, {
                force: true,
                recursive: true,
            });
        }
    });

    it("rejects super-admin setup without an adapter", async () => {
        const integration = astroFullstackStarter({
            superAdmin: {},
        });

        await expect(
            integration.hooks["astro:config:setup"]?.({
                config: {
                    root: new URL("../../../", import.meta.url),
                },
            } as AstroFullstackStarterSetupContext)
        ).rejects.toThrow("Super-admin integration requires a non-empty adapter.");
    });

    it("rejects super-admin endpoint references that are not declared", async () => {
        const integration = astroFullstackStarter({
            superAdmin: {
                adapter: "./src/spa/super-admin/adapter.ts",
            },
        });

        await expect(
            integration.hooks["astro:config:setup"]?.({
                config: {
                    root: new URL("../../../", import.meta.url),
                },
            } as AstroFullstackStarterSetupContext)
        ).rejects.toThrow(
            'Super-admin GraphQL endpoint "superAdmin" must reference an enabled GraphQL endpoint.'
        );
    });

    it("pins React dev runtime during super-admin dev dependency optimization", async () => {
        const projectRoot = new URL("../../../", import.meta.url);
        const codegenParent = new URL(".astro/", projectRoot);
        mkdirSync(codegenParent, {
            recursive: true,
        });
        const codegenRoot = mkdtempSync(
            fileURLToPath(new URL("starter-super-admin-dev-runtime-", codegenParent))
        );
        const configUpdates: unknown[] = [];
        const integration = astroFullstackStarter({
            graphql: {
                endpoints: {
                    superAdmin: {
                        path: "/api/graphql/super-admin",
                        adapter: "./src/graphql/adapters/super-admin.ts",
                    },
                },
            },
            superAdmin: {
                adapter: "./src/spa/super-admin/adapter.ts",
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

    it("allows super-admin setup without a WebSocket endpoint reference", async () => {
        const projectRoot = new URL("../../../", import.meta.url);
        const codegenParent = new URL(".astro/", projectRoot);
        mkdirSync(codegenParent, {
            recursive: true,
        });
        const codegenRoot = mkdtempSync(
            fileURLToPath(new URL("starter-super-admin-", codegenParent))
        );
        const middlewareEntrypoints: Parameters<
            AstroFullstackStarterSetupContext["addMiddleware"]
        >[0][] = [];
        const injectedRoutes: Parameters<AstroFullstackStarterSetupContext["injectRoute"]>[0][] =
            [];
        const integration = astroFullstackStarter({
            graphql: {
                endpoints: {
                    superAdmin: {
                        path: "/api/graphql/super-admin",
                        adapter: "./src/graphql/adapters/super-admin.ts",
                    },
                },
            },
            superAdmin: {
                adapter: "./src/spa/super-admin/adapter.ts",
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
                    entrypoint: pathToFileURL(`${codegenRoot}/graphql-superAdmin.mjs`),
                    pattern: "/api/graphql/super-admin",
                    prerender: false,
                },
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/super-admin-app.astro`),
                    pattern: "/super-admin",
                    prerender: false,
                },
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/super-admin-app.astro`),
                    pattern: "/super-admin/[...slug]",
                    prerender: false,
                },
            ]);
            expect(middlewareEntrypoints).toEqual([
                {
                    entrypoint: pathToFileURL(`${codegenRoot}/super-admin-middleware.mjs`),
                    order: "post",
                },
            ]);
            expect(readFileSync(middlewareEntrypoints[0].entrypoint as URL, "utf8")).toContain(
                'import { createSuperAdminMiddleware } from "@shanjing/astro-full-stack-starter/super-admin";\n' +
                    'import adapter from "../../src/spa/super-admin/adapter.ts";\n' +
                    "\n" +
                    "export const onRequest = createSuperAdminMiddleware({\n" +
                    "    adapter,\n" +
                    '    graphqlPath: "/api/graphql/super-admin",\n' +
                    '    path: "/super-admin",\n' +
                    "    websocketPath: null,\n" +
                    "});\n"
            );
            expect(
                readFileSync(pathToFileURL(`${codegenRoot}/super-admin-app.astro`), "utf8")
            ).toContain(
                `import "../../src/styles/global.css";\n` +
                    'import adapter from "../../src/spa/super-admin/adapter.ts";\n' +
                    'import SuperAdminApp from "../../src/spa/super-admin/app.tsx";\n' +
                    "\n" +
                    'const pageTitle = adapter.title ?? "Super Admin";'
            );
            expect(
                readFileSync(pathToFileURL(`${codegenRoot}/super-admin-app.astro`), "utf8")
            ).toContain(
                '<SuperAdminApp basePath="/super-admin" graphqlPath="/api/graphql/super-admin" client:only="react" />'
            );
        } finally {
            rmSync(codegenRoot, {
                force: true,
                recursive: true,
            });
        }
    });

    it("defines project-owned super-admin adapters and routes", () => {
        const auth = defineSuperAdminAuthPlugin({
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
        const routes = defineSuperAdminRoutes([
            {
                component: "ShopListPage",
                id: "shop.list",
                path: "/shop/list",
                title: "店铺",
            },
        ]);
        defineSuperAdminAdapter({
            auth,
        });
        const registry = createSuperAdminRouteRegistry(
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

    it("registers demo business pages as project-owned super-admin routes", () => {
        expect(
            projectSuperAdminRoutes.map((route) => ({
                id: route.id,
                path: route.path,
                permission: route.permission,
            }))
        ).toEqual([
            {
                id: "project.dashboard",
                path: "/",
                permission: {
                    superAdmin: ["access"],
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

    it("lets project-owned routes replace package-owned routes by path", () => {
        const registry = createSuperAdminRouteRegistry(
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

    it("derives demo business navigation from project-owned super-admin routes", () => {
        expect(
            createSuperAdminNavMain("/super-admin", projectSuperAdminRoutes).map((item) => ({
                title: item.title,
                url: item.url,
            }))
        ).toEqual(
            expect.arrayContaining([
                {
                    title: "店铺",
                    url: "/super-admin/shop/list",
                },
                {
                    title: "商品",
                    url: "/super-admin/product/list",
                },
                {
                    title: "订单",
                    url: "/super-admin/order/list",
                },
            ])
        );
        expect(
            getSuperAdminRouteMetas("/super-admin", projectSuperAdminRoutes).map(
                (routeMeta) => routeMeta.url
            )
        ).toEqual(
            expect.arrayContaining([
                "/super-admin/shop/list",
                "/super-admin/product/list",
                "/super-admin/order/list",
            ])
        );
        expect(
            createSuperAdminNavMain("/console", projectSuperAdminRoutes).map((item) => ({
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
            getSuperAdminRouteMetas("/console", projectSuperAdminRoutes).map(
                (routeMeta) => routeMeta.url
            )
        ).toEqual(
            expect.arrayContaining([
                "/console/shop/list",
                "/console/product/list",
                "/console/order/list",
            ])
        );
        expect(toSuperAdminRoutePath("/console/shop/list", "/console")).toBe("shop/list");
    });

    it("rejects duplicate super-admin project routes", () => {
        expect(() =>
            defineSuperAdminRoutes([
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
        ).toThrow('Super-admin route id "queue" is duplicated.');
    });

    it("rejects duplicate browser-side super-admin project routes", () => {
        expect(() =>
            defineSuperAdminRoutes([
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
        ).toThrow('Super-admin route id "queue" is duplicated.');
    });

    it("derives navigation from supplied package-owned super-admin routes", () => {
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
            getSuperAdminRouteMetas("/super-admin", [], builtinRoutes).map((route) => route.url)
        ).toEqual(
            expect.arrayContaining([
                "/super-admin/queues",
                "/super-admin/queues/schedules",
                "/super-admin/queues/jobs/failed",
            ])
        );
        expect(
            createSuperAdminNavMain("/super-admin", [], builtinRoutes).find(
                (route) => route.url === "/super-admin/queues"
            )?.title
        ).toBe("队列");
        expect(
            createSuperAdminNavMain("/super-admin", [], builtinRoutes)
                .find((route) => route.url === "/super-admin/queues")
                ?.items.map((item) => item.title)
        ).toEqual(expect.arrayContaining(["控制台", "队列计划", "失败任务"]));
    });

    it("uses the longest route prefix for dynamic super-admin child pages", () => {
        expect(
            getSuperAdminRouteMeta(
                "/super-admin/queues/jobs/failed/record-1",
                "/super-admin",
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
            url: "/super-admin/queues/jobs/failed",
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
        const request = new Request("https://example.com/super-admin");
        const context = {
            request,
        } as Parameters<typeof auth.getSession>[0];
        const session = await auth.getSession(context);
        const result = await auth.hasPermission({
            context,
            session: session!,
        });

        expect(result).toEqual({
            allowed: true,
            reason: "better-auth-admin",
        });
        expect(userHasPermission).toHaveBeenCalledWith({
            body: {
                permissions: {
                    superAdmin: ["access"],
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

    it("redirects unauthenticated super-admin page requests from package middleware", async () => {
        const onRequest = createSuperAdminMiddleware({
            adapter: defineSuperAdminAdapter({
                auth: defineSuperAdminAuthPlugin({
                    async getSession() {
                        return null;
                    },
                    async hasPermission() {
                        return {
                            allowed: false,
                        };
                    },
                }),
            }),
            graphqlPath: "/api/graphql/super-admin",
            path: "/super-admin",
            websocketPath: null,
        });
        const response = await onRequest(
            {
                locals: {},
                request: new Request("https://example.com/super-admin"),
                url: new URL("https://example.com/super-admin"),
            } as Parameters<typeof onRequest>[0],
            async () => new Response("next")
        );
        const redirectResponse = response as Response;

        expect(redirectResponse.status).toBe(303);
        expect(redirectResponse.headers.get("location")).toBe(
            "https://example.com/super-admin/login"
        );
    });

    it("returns GraphQL errors for unauthenticated super-admin GraphQL requests", async () => {
        const onRequest = createSuperAdminMiddleware({
            adapter: defineSuperAdminAdapter({
                auth: defineSuperAdminAuthPlugin({
                    async getSession() {
                        return null;
                    },
                    async hasPermission() {
                        return {
                            allowed: false,
                        };
                    },
                }),
            }),
            graphqlPath: "/api/graphql/super-admin",
            path: "/super-admin",
            websocketPath: null,
        });
        const response = await onRequest(
            {
                locals: {},
                request: new Request("https://example.com/api/graphql/super-admin"),
                url: new URL("https://example.com/api/graphql/super-admin"),
            } as Parameters<typeof onRequest>[0],
            async () => new Response("next")
        );
        const graphQLResponse = response as Response;

        await expect(graphQLResponse.json()).resolves.toEqual({
            errors: [
                {
                    message: "Super admin session is required.",
                },
            ],
        });
        expect(graphQLResponse.status).toBe(401);
    });

    it("returns WebSocket unauthorized responses for unauthenticated super-admin WebSocket requests", async () => {
        const onRequest = createSuperAdminMiddleware({
            adapter: defineSuperAdminAdapter({
                auth: defineSuperAdminAuthPlugin({
                    async getSession() {
                        return null;
                    },
                    async hasPermission() {
                        return {
                            allowed: false,
                        };
                    },
                }),
            }),
            graphqlPath: "/api/graphql/super-admin",
            path: "/super-admin",
            websocketPath: "/api/websocket/super-admin",
        });
        const response = await onRequest(
            {
                locals: {},
                request: new Request("https://example.com/api/websocket/super-admin"),
                url: new URL("https://example.com/api/websocket/super-admin"),
            } as Parameters<typeof onRequest>[0],
            async () => new Response("next")
        );
        const websocketResponse = response as Response;

        await expect(websocketResponse.text()).resolves.toBe("Super admin session is required.");
        expect(websocketResponse.status).toBe(401);
    });

    it("returns WebSocket forbidden responses for unauthorized super-admin WebSocket requests", async () => {
        const onRequest = createSuperAdminMiddleware({
            adapter: defineSuperAdminAdapter({
                auth: defineSuperAdminAuthPlugin({
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
            }),
            graphqlPath: "/api/graphql/super-admin",
            path: "/super-admin",
            websocketPath: "/api/websocket/super-admin",
        });
        const response = await onRequest(
            {
                locals: {},
                request: new Request("https://example.com/api/websocket/super-admin"),
                url: new URL("https://example.com/api/websocket/super-admin"),
            } as Parameters<typeof onRequest>[0],
            async () => new Response("next")
        );
        const websocketResponse = response as Response;

        await expect(websocketResponse.text()).resolves.toBe("Super admin role is required.");
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
