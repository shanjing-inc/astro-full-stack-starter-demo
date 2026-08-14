import { createGraphQLContext } from "@/graphql/context";
import { adminSchema } from "@/graphql/schemas/admin";
import { useSentryGraphQL } from "@/graphql/sentry-plugin";

import { createGraphQLRequestContextCache } from "@shanjing/astro-full-stack-starter/graphql/cache/request";
import type { GraphQLEndpointAdapter } from "@shanjing/astro-full-stack-starter/graphql";

const getRequestContextCache = createGraphQLRequestContextCache();

export const adapter = {
    batching: {
        limit: 10,
    },
    context: ({ request }) => createGraphQLContext(request, getRequestContextCache(request)),
    graphiql: true,
    plugins: [useSentryGraphQL("admin")],
    schema: adminSchema,
} satisfies GraphQLEndpointAdapter;
