import { createDbAccessors } from "@shanjing/astro-full-stack-starter/db/mysql/client";
import { defineDatabaseProvider } from "@shanjing/astro-full-stack-starter/db/provider";

import { dbRelations } from "@/db/relations";
import { dbSchema } from "@/db/schemas";

const dbAccessors = createDbAccessors({
    schema: dbSchema,
    relations: dbRelations,
});

export const databaseProvider = defineDatabaseProvider({
    dialect: "mysql",
    getDb: dbAccessors.getDb,
    relations: dbRelations,
    schema: dbSchema,
});

export const getMysqlPool = dbAccessors.getMysqlPool;
export const getDb = databaseProvider.getDb;
export const mysqlPool = dbAccessors.mysqlPool;
export const db = dbAccessors.db;
export type DenoMysqlDatabaseProvider = typeof databaseProvider;
export type Database = ReturnType<DenoMysqlDatabaseProvider["getDb"]>;
