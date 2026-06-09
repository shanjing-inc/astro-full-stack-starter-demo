import { createGraphQLContext } from "@/graphql/context";
import { adminSchema } from "@/graphql/schemas/admin";
import { useSentryGraphQL } from "@/graphql/sentry-plugin";

import type { GraphQLEndpointAdapter } from "@shanjing/astro-full-stack-starter/graphql";

export const adapter = {
    batching: {
        limit: 10,
    },
    context: ({ request }) => createGraphQLContext(request),
    graphiql: true,
    plugins: [useSentryGraphQL("admin")],
    schema: adminSchema,
} satisfies GraphQLEndpointAdapter;
