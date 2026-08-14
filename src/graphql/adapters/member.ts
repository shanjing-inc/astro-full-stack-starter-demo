import { createGraphQLContext } from "@/graphql/context";
import { memberSchema } from "@/graphql/schemas/member";
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
    plugins: [useSentryGraphQL("member")],
    schema: memberSchema,
} satisfies GraphQLEndpointAdapter;
