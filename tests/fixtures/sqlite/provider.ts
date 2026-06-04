import {
    createBetterSqliteDb,
    type BetterSqliteDatabase,
} from "@shanjing/astro-full-stack-starter/db/sqlite/client";
import { createSqliteDatabaseProvider } from "@shanjing/astro-full-stack-starter/db/sqlite/provider";

import { sqliteDbRelations } from "./relations";
import { sqliteDbSchema } from "./schemas";

export type SqliteTestDatabase = BetterSqliteDatabase<
    typeof sqliteDbSchema,
    typeof sqliteDbRelations
>;

export function createSqliteTestDatabase(): SqliteTestDatabase {
    return createBetterSqliteDb({
        relations: sqliteDbRelations,
        schema: sqliteDbSchema,
        source: ":memory:",
    });
}

export function createSqliteTestDatabaseProvider(
    options: {
        createDb?: (options: {
            relations: typeof sqliteDbRelations;
            schema: typeof sqliteDbSchema;
        }) => SqliteTestDatabase;
    } = {}
) {
    return createSqliteDatabaseProvider({
        createDb: options.createDb ?? createSqliteTestDatabase,
        relations: sqliteDbRelations,
        schema: sqliteDbSchema,
    });
}
