import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
    createDatabaseTargetSummary,
    getPendingMigrations,
    readMigrationFiles,
    runMigrationPlan,
    splitMigrationStatements,
    type MigrationDatabaseConnection,
} from "../../../scripts/migration/migrate";

const tempDirs: string[] = [];

class FakeMigrationConnection implements MigrationDatabaseConnection {
    readonly statements: Array<{ method: "execute" | "query"; params: unknown[]; sql: string }> =
        [];

    didBeginTransaction = false;
    didCommit = false;
    didRollback = false;
    didEnd = false;
    tableExists = true;
    columns = ["id", "hash", "created_at", "name", "applied_at"];
    migrationRows: Array<{
        created_at: number | string;
        hash: string;
        id: number;
        name: string | null;
    }> = [];

    async query<T = Record<string, unknown>>(
        sql: string,
        params: unknown[] = []
    ): Promise<readonly [T[], unknown]> {
        this.statements.push({ method: "query", params, sql });

        let rows: unknown[] = [];

        if (sql.includes("information_schema.tables")) {
            rows = this.tableExists ? [{ found: 1 }] : [];
            return [rows as T[], []];
        }

        if (sql.includes("information_schema.columns")) {
            rows = this.columns.map((column_name) => ({ column_name }));
            return [rows as T[], []];
        }

        if (sql.includes("SELECT id, hash, created_at, name")) {
            return [this.migrationRows as T[], []];
        }

        if (sql.includes("SELECT id, hash, created_at FROM")) {
            rows = this.migrationRows.map(({ created_at, hash, id }) => ({
                created_at,
                hash,
                id,
            }));
            return [rows as T[], []];
        }

        return [rows as T[], []];
    }

    async execute(sql: string, params: unknown[] = []): Promise<readonly [unknown, unknown]> {
        this.statements.push({ method: "execute", params, sql });

        return [[], []];
    }

    async beginTransaction() {
        this.didBeginTransaction = true;
    }

    async commit() {
        this.didCommit = true;
    }

    async rollback() {
        this.didRollback = true;
    }

    async end() {
        this.didEnd = true;
    }
}

async function createTempDir() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-runner-"));
    tempDirs.push(tempDir);

    return tempDir;
}

async function writeMigration(rootDir: string, name: string, sql: string) {
    const migrationDir = path.join(rootDir, name);

    await mkdir(migrationDir, { recursive: true });
    await writeFile(path.join(migrationDir, "migration.sql"), sql);
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((tempDir) => rm(tempDir, { force: true, recursive: true }))
    );
});

describe("Deno MySQL migration runner", () => {
    it("reads drizzle migrations in folder order with Drizzle-compatible metadata", async () => {
        const migrationsDir = await createTempDir();
        const firstSql = [
            "CREATE TABLE first_table (id serial PRIMARY KEY);",
            "--> statement-breakpoint",
            "CREATE INDEX first_table_id_idx ON first_table (id);",
        ].join("\n");
        const secondSql = "CREATE TABLE second_table (id serial PRIMARY KEY);";

        await writeMigration(migrationsDir, "20260607000000_time_semantics", secondSql);
        await writeMigration(migrationsDir, "20260414085932_naive_harpoon", firstSql);

        expect(splitMigrationStatements(firstSql)).toHaveLength(2);

        const migrations = await readMigrationFiles(migrationsDir);

        expect(migrations.map((migration) => migration.name)).toEqual([
            "20260414085932_naive_harpoon",
            "20260607000000_time_semantics",
        ]);
        expect(migrations[0]?.folderMillis).toBe(Date.UTC(2026, 3, 14, 8, 59, 32));
        expect(migrations[0]?.hash).toBe(createHash("sha256").update(firstSql).digest("hex"));
        expect(migrations[0]?.statements).toEqual([
            "CREATE TABLE first_table (id serial PRIMARY KEY);\n",
            "\nCREATE INDEX first_table_id_idx ON first_table (id);",
        ]);
    });

    it("masks DATABASE_URL username and password in target summaries", () => {
        const summary = createDatabaseTargetSummary(
            "mysql://deploy-token-prod:super-secret@db.example.com:3307/customer_app?ssl=1"
        );
        const serializedSummary = JSON.stringify(summary);

        expect(summary).toMatchObject({
            database: "customer_app",
            host: "db.example.com",
            port: "3307",
            username: "<hidden>",
        });
        expect(serializedSummary).not.toContain("deploy-token-prod");
        expect(serializedSummary).not.toContain("super-secret");
    });

    it("skips applied migrations from both current and legacy Drizzle records", async () => {
        const migrationsDir = await createTempDir();

        await writeMigration(migrationsDir, "20260414085932_naive_harpoon", "SELECT 1;");
        await writeMigration(migrationsDir, "20260425054547_brave_hawkeye", "SELECT 2;");

        const migrations = await readMigrationFiles(migrationsDir);
        const pending = getPendingMigrations(migrations, [
            {
                created_at: migrations[0]?.folderMillis ?? 0,
                hash: migrations[0]?.hash ?? "",
                id: 1,
                name: null,
            },
        ]);

        expect(pending.map((migration) => migration.name)).toEqual([
            "20260425054547_brave_hawkeye",
        ]);
    });

    it("prints dry-run status without executing migration SQL", async () => {
        const migrationsDir = await createTempDir();

        await writeMigration(migrationsDir, "20260414085932_naive_harpoon", "SELECT 1;");
        await writeMigration(
            migrationsDir,
            "20260425054547_brave_hawkeye",
            "SELECT 2;\n--> statement-breakpoint\nSELECT 3;"
        );

        const migrations = await readMigrationFiles(migrationsDir);
        const connection = new FakeMigrationConnection();
        const logs: string[] = [];

        connection.migrationRows = [
            {
                created_at: migrations[0]?.folderMillis ?? 0,
                hash: migrations[0]?.hash ?? "",
                id: 1,
                name: migrations[0]?.name ?? null,
            },
        ];

        const result = await runMigrationPlan({
            connection,
            databaseUrl: "mysql://deploy-token-prod:super-secret@db.example.com:3307/customer_app",
            dryRun: true,
            logger: {
                error: (message) => logs.push(message),
                info: (message) => logs.push(message),
            },
            migrationsDir,
        });

        const output = logs.join("\n");

        expect(result.pendingMigrations.map((migration) => migration.name)).toEqual([
            "20260425054547_brave_hawkeye",
        ]);
        expect(output).toContain("[migrate] mode: dry-run");
        expect(output).toContain("[migrate] pending migrations: 1");
        expect(output).toContain("20260425054547_brave_hawkeye statements=2");
        expect(output).not.toContain("deploy-token-prod");
        expect(output).not.toContain("super-secret");
        expect(connection.didBeginTransaction).toBe(false);
        expect(connection.statements.some((statement) => statement.sql.includes("SELECT 2"))).toBe(
            false
        );
        expect(
            connection.statements.some((statement) => statement.sql.includes("INSERT INTO"))
        ).toBe(false);
    });
});
