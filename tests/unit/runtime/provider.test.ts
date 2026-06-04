import { describe, expect, it } from "vitest";

import { createMysqlDatabaseProvider } from "@shanjing/astro-full-stack-starter/db/mysql/provider";

import { databaseProvider } from "@/db/client";
import { dbRelations } from "@/db/relations";
import { dbSchema, user } from "@/db/schemas";

describe("Deno MySQL demo provider wiring", () => {
    it("wraps the Deno MySQL schema and relations in a database provider", () => {
        expect(databaseProvider.dialect).toBe("mysql");
        expect(databaseProvider.schema).toBe(dbSchema);
        expect(databaseProvider.relations).toBe(dbRelations);
        expect(databaseProvider.schema.user).toBe(user);
    });

    it("keeps the MySQL provider factory aligned with project schema contracts", () => {
        const provider = createMysqlDatabaseProvider({
            globalKey: "provider-test",
            relations: dbRelations,
            schema: dbSchema,
        });

        expect(provider.dialect).toBe(databaseProvider.dialect);
        expect(provider.schema).toBe(databaseProvider.schema);
        expect(provider.relations).toBe(databaseProvider.relations);
    });
});
