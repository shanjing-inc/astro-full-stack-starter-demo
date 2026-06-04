import { createOrderLoaders } from "@/graphql/loaders/order";
import { createProductLoaders } from "@/graphql/loaders/product";
import { createShopLoaders } from "@/graphql/loaders/shop";

import type { Database } from "@/db/client";

export function createGraphQLLoaders(database: Database) {
    return {
        ...createShopLoaders(database),
        ...createProductLoaders(database),
        ...createOrderLoaders(database),
    };
}

export type GraphQLLoaders = ReturnType<typeof createGraphQLLoaders>;
