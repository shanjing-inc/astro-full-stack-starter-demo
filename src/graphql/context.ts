import { databaseProvider } from "@/db/client";
import { createGraphQLLoaders } from "@/graphql/loaders";
import { getAuth } from "@/lib/auth";

import type { Database } from "@/db/client";
import type { GraphQLLoaders } from "@/graphql/loaders";

type AuthSession = ReturnType<typeof getAuth>["$Infer"]["Session"];

export interface GraphQLContext {
    db: Database;
    loaders: GraphQLLoaders;
    request: Request;
    session: AuthSession["session"] | null;
    sessionUser: AuthSession["user"] | null;
}

export async function createGraphQLContext(request: Request): Promise<GraphQLContext> {
    const db = databaseProvider.getDb();
    const session = await getAuth().api.getSession({
        headers: request.headers,
    });

    return {
        db,
        loaders: createGraphQLLoaders(db),
        request,
        session: session?.session ?? null,
        sessionUser: session?.user ?? null,
    };
}
