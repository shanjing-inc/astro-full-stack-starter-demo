import { createCloudflareD1DatabaseProvider, getCloudflareD1Env } from "@/db/client";
import { createGraphQLLoaders } from "@/graphql/loaders";
import { getAuth } from "@/lib/auth";
import { createQueueExecutionStore, createQueueRuntime } from "@/queues/runtime";

import type {
    DashboardCreateUserInput,
    DashboardCreateUserResult,
} from "@shanjing/astro-full-stack-starter/graphql/schemas/dashboard";

type DashboardAuthRole = "admin" | "member" | "owner" | "user";

export async function createGraphQLContext(request: Request) {
    const env = getCloudflareD1Env();
    const provider = createCloudflareD1DatabaseProvider(env);
    const auth = getAuth();
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    return {
        createDashboardUser: async (
            input: DashboardCreateUserInput
        ): Promise<DashboardCreateUserResult> => {
            const response = await auth.api.createUser({
                body: {
                    email: input.email,
                    name: input.name,
                    password: input.password,
                    role: input.role as DashboardAuthRole | undefined,
                },
                headers: request.headers,
            });

            return {
                id: response.user.id,
            };
        },
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
