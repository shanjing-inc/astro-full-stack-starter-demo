import { createGraphQLContext } from "@/graphql/context";
import { memberSchema } from "@/graphql/schemas/member";
import { useSentryGraphQL } from "@/graphql/sentry-plugin";

import type { GraphQLEndpointAdapter } from "@shanjing/astro-full-stack-starter/graphql";

export const adapter = {
    context: ({ request }) => createGraphQLContext(request),
    graphiql: true,
    plugins: [useSentryGraphQL("member")],
    schema: memberSchema,
} satisfies GraphQLEndpointAdapter;
