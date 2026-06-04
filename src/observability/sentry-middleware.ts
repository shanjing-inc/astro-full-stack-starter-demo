import { AstroError } from "astro/errors";

import { initSentry, reportException } from "@/observability/sentry";

import type { MiddlewareHandler } from "astro";

export const sentryMiddleware: MiddlewareHandler = async (context, next) => {
    initSentry("astro-server");

    try {
        return await next();
    } catch (error) {
        reportException(error, {
            context,
            extra: {
                pathname: context.url.pathname,
            },
            tags: {
                endpoint: context.url.pathname,
                runtime: "astro-server",
            },
        });

        if (error instanceof Error) {
            throw error;
        }

        throw new AstroError(String(error));
    }
};
