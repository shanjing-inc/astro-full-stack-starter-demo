import {
    createBetterSqliteDb,
    type BetterSqliteDatabase,
} from "@shanjing/astro-full-stack-starter/db/sqlite/client";
import { createSqliteDatabaseProvider } from "@shanjing/astro-full-stack-starter/db/sqlite/provider";

import { dbRelations } from "@/db/relations";
import { dbSchema } from "@/db/schemas";

export type SqliteTestDatabase = BetterSqliteDatabase<typeof dbSchema, typeof dbRelations>;

export function createSqliteTestDatabase(): SqliteTestDatabase {
    return createBetterSqliteDb({
        relations: dbRelations,
        schema: dbSchema,
        source: ":memory:",
    });
}

export function createSqliteTestDatabaseProvider(
    options: {
        createDb?: (options: {
            relations: typeof dbRelations;
            schema: typeof dbSchema;
        }) => SqliteTestDatabase;
    } = {}
) {
    return createSqliteDatabaseProvider({
        createDb: options.createDb ?? createSqliteTestDatabase,
        relations: dbRelations,
        schema: dbSchema,
    });
}
