import type { Plugin } from "graphql-yoga";

import { reportException } from "@/observability/sentry";
import { useSentryGraphQL as useStarterSentryGraphQL } from "@shanjing/astro-full-stack-starter/observability/sentry/graphql";

type GraphQLEndpoint = "member" | "admin";

export function useSentryGraphQL(endpoint: GraphQLEndpoint): Plugin {
    return useStarterSentryGraphQL(endpoint, {
        reportException,
    });
}
