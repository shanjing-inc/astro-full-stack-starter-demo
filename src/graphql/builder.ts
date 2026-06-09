import { getTableConfig } from "drizzle-orm/mysql-core";

import { createGraphQLBuilder } from "@shanjing/astro-full-stack-starter/graphql/builder";

import { databaseProvider } from "@/db/client";

import type { GraphQLContext } from "@/graphql/context";
import type { JsonValue as PackageJsonValue } from "@shanjing/astro-full-stack-starter/graphql/builder";

export type JsonValue = PackageJsonValue;

export function createBuilder() {
    return createGraphQLBuilder<GraphQLContext, typeof databaseProvider.relations>({
        getTableConfig,
        relations: databaseProvider.relations,
    });
}

export type PothosBuilder = ReturnType<typeof createBuilder>;
