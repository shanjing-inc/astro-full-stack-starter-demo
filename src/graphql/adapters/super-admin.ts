import { createGraphQLContext } from "@/graphql/context";
import { superAdminSchema } from "@/graphql/schemas/super-admin";
import { useSentryGraphQL } from "@/graphql/sentry-plugin";

import type { GraphQLEndpointAdapter } from "@shanjing/astro-full-stack-starter/graphql";

export const adapter = {
    batching: {
        limit: 10,
    },
    context: ({ request }) => createGraphQLContext(request),
    graphiql: true,
    plugins: [useSentryGraphQL("super-admin")],
    schema: superAdminSchema,
} satisfies GraphQLEndpointAdapter;
