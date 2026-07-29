import type { APIRoute } from "astro";

import { getMysqlPool } from "@/db/client";
import { getIdleMemoryReclaimController } from "@shanjing/astro-full-stack-starter/runtime/idle-memory-reclaim";
import { collectRuntimeMemorySnapshot } from "@shanjing/astro-full-stack-starter/runtime/memory";

export const prerender = false;

/**
 * Runtime diagnostics for Deno/Web isolate memory (FEATURE-272).
 * Canonical path: /api/rest/internal/runtime-memory (align with anyishou REST prefix).
 * Keep public only for temporary diagnosis; lock down in production when possible.
 */
export const GET: APIRoute = async () => {
    const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env;
    const snapshot = await collectRuntimeMemorySnapshot({
        databaseUrl: import.meta.env.DATABASE_URL ?? processEnv?.DATABASE_URL,
        getMysqlPool: () => {
            try {
                return getMysqlPool();
            } catch {
                return null;
            }
        },
        role: "web",
    });

    const responseSnapshot = {
        ...snapshot,
        idleMemoryReclaim: getIdleMemoryReclaimController().getDiagnostics(),
    };

    return new Response(JSON.stringify(responseSnapshot, null, 2), {
        headers: {
            "cache-control": "no-store",
            "content-type": "application/json; charset=utf-8",
        },
        status: 200,
    });
};
