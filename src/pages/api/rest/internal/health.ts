import type { APIRoute } from "astro";

export const prerender = false;

const headers = {
    "cache-control": "no-store",
    "content-type": "text/plain; charset=utf-8",
};

export const GET: APIRoute = () =>
    new Response("ok\n", {
        headers,
        status: 200,
    });

export const HEAD: APIRoute = () =>
    new Response(null, {
        headers,
        status: 200,
    });
