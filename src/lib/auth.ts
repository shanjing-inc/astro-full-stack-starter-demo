import { AstroError } from "astro/errors";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAccessControl } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";

import { createCloudflareD1DatabaseProvider, getCloudflareD1Env } from "@/db/client";
import { hashPassword, verifyPassword } from "@/lib/password-hashing";
import { dbSchema } from "@/db/relations";
import { getEnvVar } from "@shanjing/astro-full-stack-starter/runtime/env";

function getRequiredEnv(name: "BETTER_AUTH_ALLOWED_HOSTS" | "BETTER_AUTH_SECRET") {
    const cloudflareValue = getCloudflareD1Env()[name]?.trim();
    const value = getEnvVar(name)?.trim() || cloudflareValue;

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
    queue: ["read"],
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
    queue: ["read"],
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

const provider = createCloudflareD1DatabaseProvider(getCloudflareD1Env());

export const auth = betterAuth({
    appName: "Cloudflare D1 Demo",
    baseURL: {
        allowedHosts: getAllowedHosts(),
    },
    secret: getRequiredEnv("BETTER_AUTH_SECRET"),
    database: drizzleAdapter(provider.getDb(), {
        provider: "sqlite",
        schema: dbSchema,
    }),
    emailAndPassword: {
        enabled: true,
        password: {
            hash: hashPassword,
            verify: verifyPassword,
        },
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
