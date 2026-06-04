import { createCloudflareD1DatabaseProvider, getCloudflareD1Env } from "@/db/client";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () => {
    const provider = createCloudflareD1DatabaseProvider(getCloudflareD1Env());

    return Response.json({
        ok: true,
        platform: "cloudflare",
        dialect: provider.dialect,
    });
};
