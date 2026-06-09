import { AstroError } from "astro/errors";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAccessControl } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";

import { databaseProvider } from "@/db/client";
import { getEnvVar } from "@shanjing/astro-full-stack-starter/runtime/env";

function getRequiredEnv(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_ALLOWED_HOSTS") {
    const value = getEnvVar(name)?.trim();

    if (!value) {
        throw new AstroError(`Missing required environment variable: ${name}`);
    }

    return value;
}

function getAllowedHosts() {
    const hosts = getRequiredEnv("BETTER_AUTH_ALLOWED_HOSTS")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean);

    if (hosts.length === 0) {
        throw new AstroError(
            "BETTER_AUTH_ALLOWED_HOSTS must include at least one host pattern, such as localhost:*."
        );
    }

    return hosts;
}

const accessStatements = {
    dashboard: ["access:admin", "access:member"],
    order: ["list"],
    product: ["list"],
    queue: ["read", "retry", "clean"],
    session: ["list", "revoke", "delete"],
    shop: ["list"],
    system: ["owner"],
    user: [
        "create",
        "list",
        "set-role",
        "ban",
        "impersonate",
        "delete",
        "set-password",
        "get",
        "update",
    ],
} as const;

const accessControl = createAccessControl(accessStatements);

const ownerRole = accessControl.newRole(accessStatements);

const adminRole = accessControl.newRole({
    dashboard: ["access:admin", "access:member"],
    order: ["list"],
    product: ["list"],
    queue: ["read", "retry", "clean"],
    session: ["list", "revoke", "delete"],
    shop: ["list"],
    system: [],
    user: [
        "create",
        "list",
        "set-role",
        "ban",
        "impersonate",
        "delete",
        "set-password",
        "get",
        "update",
    ],
});

const memberRole = accessControl.newRole({
    dashboard: ["access:member"],
    order: [],
    product: [],
    queue: [],
    session: [],
    shop: [],
    system: [],
    user: [],
});

const userRole = accessControl.newRole({
    dashboard: [],
    order: [],
    product: [],
    queue: [],
    session: [],
    shop: [],
    system: [],
    user: [],
});

export const auth = betterAuth({
    appName: "Test Astro With Deno",
    baseURL: {
        allowedHosts: getAllowedHosts(),
    },
    secret: getRequiredEnv("BETTER_AUTH_SECRET"),
    database: drizzleAdapter(databaseProvider.getDb(), {
        provider: databaseProvider.dialect,
        schema: databaseProvider.schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        admin({
            roles: {
                admin: adminRole,
                member: memberRole,
                owner: ownerRole,
                user: userRole,
            },
        }),
        bearer(),
    ],
    advanced: {
        database: {
            generateId: "serial",
        },
    },
});

export function getAuth() {
    return auth;
}
