import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { getTableConfig } from "drizzle-orm/mysql-core";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
    account,
    session,
    user,
    verification,
} from "@shanjing/astro-full-stack-starter/db/mysql/schemas";

import {
    dbSchema,
    order,
    orderStatusEnum,
    product,
    productStatusEnum,
    shop,
    shopStatusEnum,
} from "@/db/schemas";

describe("database schemas", () => {
    const zonedDateTimeUsageMessage =
        "MySQL schema time fields must use zonedDateTime from @shanjing/astro-full-stack-starter/db/mysql/schemas. Replace datetime from drizzle-orm/mysql-core.";
    const mysqlSchemaSourcePaths = [
        path.resolve("src/db/schemas.ts"),
        path.resolve("../../packages/astro-full-stack-starter/src/db/mysql/schemas.ts"),
    ];
    const expectedDatetimeSnapshotColumns = [
        ["account", "access_token_expires_at"],
        ["account", "refresh_token_expires_at"],
        ["account", "created_at"],
        ["account", "updated_at"],
        ["session", "expires_at"],
        ["session", "created_at"],
        ["session", "updated_at"],
        ["user", "ban_expires"],
        ["user", "created_at"],
        ["user", "updated_at"],
        ["verification", "expires_at"],
        ["verification", "created_at"],
        ["verification", "updated_at"],
        ["shop", "created_at"],
        ["shop", "updated_at"],
        ["product", "created_at"],
        ["product", "updated_at"],
        ["order", "created_at"],
        ["order", "updated_at"],
    ] as const;
    const expectedUpdatedAtSnapshotColumns = [
        "account",
        "session",
        "user",
        "verification",
        "shop",
        "product",
        "order",
    ] as const;

    function expectDateTimeColumns(table: unknown, columnNames: string[]) {
        const columns = getTableConfig(table as never).columns.filter((column) =>
            columnNames.includes(column.name)
        );

        expect(columns.map((column) => [column.name, column.getSQLType()])).toEqual(
            columnNames.map((columnName) => [columnName, "datetime"])
        );
    }

    function formatSourceLocation(sourceFile: ts.SourceFile, node: ts.Node) {
        const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

        return `${sourceFile.fileName}:${location.line + 1}:${location.character + 1}`;
    }

    function collectMysqlCoreDateTimeUsages(sourcePath: string) {
        const sourceFile = ts.createSourceFile(
            sourcePath,
            readFileSync(sourcePath, "utf8"),
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TS
        );
        const dateTimeImportNames = new Map<string, ts.Node>();
        const mysqlCoreNamespaceNames = new Set<string>();
        const usageMessages: string[] = [];

        ts.forEachChild(sourceFile, function collectImports(node) {
            if (
                ts.isImportDeclaration(node) &&
                ts.isStringLiteral(node.moduleSpecifier) &&
                node.moduleSpecifier.text === "drizzle-orm/mysql-core"
            ) {
                const namedBindings = node.importClause?.namedBindings;

                if (namedBindings && ts.isNamedImports(namedBindings)) {
                    for (const element of namedBindings.elements) {
                        if ((element.propertyName?.text ?? element.name.text) === "datetime") {
                            dateTimeImportNames.set(element.name.text, element);
                        }
                    }
                }

                if (namedBindings && ts.isNamespaceImport(namedBindings)) {
                    mysqlCoreNamespaceNames.add(namedBindings.name.text);
                }
            }

            ts.forEachChild(node, collectImports);
        });

        for (const importNode of dateTimeImportNames.values()) {
            usageMessages.push(`${formatSourceLocation(sourceFile, importNode)} import datetime`);
        }

        ts.forEachChild(sourceFile, function collectCalls(node) {
            if (
                ts.isCallExpression(node) &&
                ts.isIdentifier(node.expression) &&
                dateTimeImportNames.has(node.expression.text)
            ) {
                usageMessages.push(
                    `${formatSourceLocation(sourceFile, node.expression)} call datetime`
                );
            }

            if (
                ts.isCallExpression(node) &&
                ts.isPropertyAccessExpression(node.expression) &&
                node.expression.name.text === "datetime" &&
                ts.isIdentifier(node.expression.expression) &&
                mysqlCoreNamespaceNames.has(node.expression.expression.text)
            ) {
                usageMessages.push(
                    `${formatSourceLocation(sourceFile, node.expression)} call namespace datetime`
                );
            }

            ts.forEachChild(node, collectCalls);
        });

        return usageMessages;
    }

    it("exports all app tables and status enum values", () => {
        expect(Object.keys(dbSchema)).toEqual([
            "user",
            "session",
            "account",
            "verification",
            "shop",
            "product",
            "order",
        ]);
        expect(shopStatusEnum).toEqual(["draft", "active", "archived"]);
        expect(productStatusEnum).toEqual(["draft", "active", "archived"]);
        expect(orderStatusEnum).toEqual(["pending", "paid", "shipped", "completed", "cancelled"]);
    });

    it("declares indexes and foreign keys for auth and commerce tables", () => {
        const configs = [
            getTableConfig(user),
            getTableConfig(session),
            getTableConfig(account),
            getTableConfig(verification),
            getTableConfig(shop),
            getTableConfig(product),
            getTableConfig(order),
        ];

        expect(configs.map((config) => config.name)).toEqual([
            "user",
            "session",
            "account",
            "verification",
            "shop",
            "product",
            "order",
        ]);
        expect(getTableConfig(user).indexes.map((index) => index.config.name)).toEqual([
            "user_email_unique",
            "user_role_idx",
        ]);
        expect(getTableConfig(product).foreignKeys).toHaveLength(1);
        expect(getTableConfig(order).foreignKeys).toHaveLength(2);
    });

    it("resolves foreign key references for auth and commerce tables", () => {
        const foreignKeyReferences = [
            ...getTableConfig(session).foreignKeys,
            ...getTableConfig(account).foreignKeys,
            ...getTableConfig(product).foreignKeys,
            ...getTableConfig(order).foreignKeys,
        ].map((foreignKey) => foreignKey.reference());

        expect(
            foreignKeyReferences.map((reference) =>
                reference.foreignColumns.map((column) => column.name)
            )
        ).toEqual([["id"], ["id"], ["id"], ["id"], ["id"]]);
        expect(
            foreignKeyReferences.map((reference) => reference.columns.map((column) => column.name))
        ).toEqual([["user_id"], ["user_id"], ["shop_id"], ["shop_id"], ["product_id"]]);
    });

    it("uses MySQL DATETIME for commerce business time fields", () => {
        expectDateTimeColumns(shop, ["created_at", "updated_at"]);
        expectDateTimeColumns(product, ["created_at", "updated_at"]);
        expectDateTimeColumns(order, ["created_at", "updated_at"]);
    });

    it("uses zonedDateTime for MySQL schema time fields", () => {
        const disallowedUsages = mysqlSchemaSourcePaths.flatMap((sourcePath) =>
            collectMysqlCoreDateTimeUsages(sourcePath)
        );

        expect(disallowedUsages, zonedDateTimeUsageMessage).toEqual([]);
    });

    it("adds a migration that converts timestamp columns to datetime in UTC", () => {
        const drizzleDir = path.resolve("drizzle");
        const migrationSql = readdirSync(drizzleDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => path.join(drizzleDir, entry.name, "migration.sql"))
            .map((migrationPath) => readFileSync(migrationPath, "utf8"))
            .find((sql) => sql.includes("SET time_zone = '+00:00';"));

        expect(migrationSql).toBeDefined();
        expect(migrationSql).toContain("MODIFY COLUMN `created_at` datetime");
        expect(migrationSql).toContain("MODIFY COLUMN `updated_at` datetime");
        expect(migrationSql).toContain("ON UPDATE CURRENT_TIMESTAMP");
    });

    it("records the datetime migration snapshot for Drizzle history", () => {
        const snapshotPath = path.resolve(
            "drizzle",
            "20260607000000_time_semantics",
            "snapshot.json"
        );
        const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
            prevIds: string[];
            ddl: Array<{
                entityType?: string;
                name?: string;
                onUpdateNow?: boolean;
                table?: string;
                type?: string;
            }>;
        };

        const snapshotColumnTypes = expectedDatetimeSnapshotColumns.map(([table, columnName]) => {
            const column = snapshot.ddl.find(
                (entry) =>
                    entry.entityType === "columns" &&
                    entry.table === table &&
                    entry.name === columnName
            );

            return [table, columnName, column?.type];
        });

        expect(snapshot.prevIds).toEqual(["2cf8ea27-543c-4bbe-a479-f535a1ce291e"]);
        expect(snapshotColumnTypes).toEqual(
            expectedDatetimeSnapshotColumns.map(([table, columnName]) => [
                table,
                columnName,
                "datetime",
            ])
        );
    });

    it("keeps on-update metadata in the datetime migration snapshot", () => {
        const snapshotPath = path.resolve(
            "drizzle",
            "20260607000000_time_semantics",
            "snapshot.json"
        );
        const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
            ddl: Array<{
                entityType?: string;
                name?: string;
                onUpdateNow?: boolean;
                table?: string;
            }>;
        };

        const snapshotUpdatedAtOnUpdate = expectedUpdatedAtSnapshotColumns.map((table) => {
            const column = snapshot.ddl.find(
                (entry) =>
                    entry.entityType === "columns" &&
                    entry.table === table &&
                    entry.name === "updated_at"
            );

            return [table, column?.onUpdateNow];
        });

        expect(snapshotUpdatedAtOnUpdate).toEqual(
            expectedUpdatedAtSnapshotColumns.map((table) => [table, true])
        );
    });
});
