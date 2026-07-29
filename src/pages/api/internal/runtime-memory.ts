import type { APIRoute } from "astro";

export const prerender = false;

/**
 * @deprecated Prefer GET /api/rest/internal/runtime-memory.
 * Temporary redirect so older docs/probes keep working.
 */
export const GET: APIRoute = ({ url }) => {
    const target = new URL("/api/rest/internal/runtime-memory", url);
    target.search = url.search;

    return new Response(null, {
        headers: {
            location: `${target.pathname}${target.search}`,
        },
        status: 308,
    });
};
