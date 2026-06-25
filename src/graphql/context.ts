import { databaseProvider } from "@/db/client";
import { createGraphQLLoaders } from "@/graphql/loaders";
import { getAuth } from "@/lib/auth";

import type { Database } from "@/db/client";
import type { GraphQLLoaders } from "@/graphql/loaders";
import type {
    DashboardCreateUserInput,
    DashboardCreateUserResult,
} from "@shanjing/astro-full-stack-starter/graphql/schemas/dashboard";

type AuthSession = ReturnType<typeof getAuth>["$Infer"]["Session"];
type DashboardAuthRole = "admin" | "member" | "owner" | "user";

export interface GraphQLContext {
    db: Database;
    loaders: GraphQLLoaders;
    request: Request;
    session: AuthSession["session"] | null;
    sessionUser: AuthSession["user"] | null;
    createDashboardUser(input: DashboardCreateUserInput): Promise<DashboardCreateUserResult>;
}

export async function createGraphQLContext(request: Request): Promise<GraphQLContext> {
    const db = databaseProvider.getDb();
    const auth = getAuth();
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    return {
        createDashboardUser: async (input) => {
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
        db,
        loaders: createGraphQLLoaders(db),
        request,
        session: session?.session ?? null,
        sessionUser: session?.user ?? null,
    };
}
