import { createCloudflareD1DatabaseProvider, getCloudflareD1Env } from "@/db/client";
import { createGraphQLLoaders } from "@/graphql/loaders";
import { getAuth } from "@/lib/auth";
import { createQueueExecutionStore, createQueueRuntime } from "@/queues/runtime";

export async function createGraphQLContext(request: Request) {
    const env = getCloudflareD1Env();
    const provider = createCloudflareD1DatabaseProvider(env);
    const session = await getAuth().api.getSession({
        headers: request.headers,
    });

    return {
        db: provider.getDb(),
        loaders: createGraphQLLoaders(provider.getDb()),
        queueExecutionStore: createQueueExecutionStore(env),
        queueRuntime: createQueueRuntime(env),
        request,
        session: session?.session ?? null,
        sessionUser: session?.user ?? null,
    };
}

export type GraphQLContext = Awaited<ReturnType<typeof createGraphQLContext>>;
