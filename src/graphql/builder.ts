import { getTableConfig } from "drizzle-orm/sqlite-core";

import { createGraphQLBuilder } from "@shanjing/astro-full-stack-starter/graphql/builder";

import { dbRelations } from "@/db/relations";

import type { GraphQLContext } from "@/graphql/context";
import type { JsonValue as PackageJsonValue } from "@shanjing/astro-full-stack-starter/graphql/builder";

export type JsonValue = PackageJsonValue;

export function createBuilder() {
    return createGraphQLBuilder<GraphQLContext, typeof dbRelations>({
        getTableConfig,
        relations: dbRelations,
    });
}

export type PothosBuilder = ReturnType<typeof createBuilder>;
