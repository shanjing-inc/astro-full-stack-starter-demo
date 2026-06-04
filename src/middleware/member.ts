import { defineMiddleware } from "astro:middleware";

import { getAuth } from "@/lib/auth";
import { createWebSocketUnauthorizedResponse } from "@shanjing/astro-full-stack-starter/websocket/responses";

function isMemberWebSocketRoute(pathname: string) {
    return pathname === "/api/websocket/member";
}

export const onRequest = defineMiddleware(async (context, next) => {
    if (!isMemberWebSocketRoute(context.url.pathname)) {
        return next();
    }

    const session = await getAuth().api.getSession({
        headers: context.request.headers,
    });

    if (!session) {
        context.locals.session = null;
        context.locals.user = null;

        return createWebSocketUnauthorizedResponse();
    }

    context.locals.session = session.session;
    context.locals.user = session.user;

    return next();
});
