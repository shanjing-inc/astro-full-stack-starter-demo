import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { SqliteTestDatabase } from "./provider";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(fixtureDir, "../../../..");
const defaultMigrationsDir = path.resolve(fixtureDir, "../../../../.tmp/sqlite-test-migrations");

export default function setupSqliteTestMigrations() {
    rmSync(defaultMigrationsDir, {
        force: true,
        recursive: true,
    });
    mkdirSync(defaultMigrationsDir, {
        recursive: true,
    });

    execFileSync(
        "pnpm",
        [
            "exec",
            "drizzle-kit",
            "generate",
            "--dialect",
            "sqlite",
            "--schema",
            "tests/integration/fixtures/sqlite/schemas.ts",
            "--out",
            ".tmp/sqlite-test-migrations",
            "--name",
            "init",
        ],
        {
            cwd: projectRoot,
            stdio: "inherit",
        }
    );
}

export interface InitializeSqliteTestDatabaseOptions {
    migrationsDir?: string;
}

/** Initializes a test SQLite database with SQL generated from the fixture schema. */
export function initializeSqliteTestDatabase(
    db: SqliteTestDatabase,
    options: InitializeSqliteTestDatabaseOptions = {}
) {
    const migrationsDir = options.migrationsDir ?? defaultMigrationsDir;
    const sqlFiles = listMigrationSqlFiles(migrationsDir);

    for (const sqlFile of sqlFiles) {
        const migrationSql = readFileSync(sqlFile, "utf8");
        const statements = migrationSql
            .split("--> statement-breakpoint")
            .map((statement) => statement.trim())
            .filter(Boolean);

        for (const statement of statements) {
            db.$client.exec(statement);
        }
    }
}

function listMigrationSqlFiles(migrationsDir: string): string[] {
    if (!existsSync(migrationsDir)) {
        throw new Error(`Missing generated SQLite test migrations: ${migrationsDir}`);
    }

    return collectMigrationSqlFiles(migrationsDir).sort();
}

function collectMigrationSqlFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            return collectMigrationSqlFiles(entryPath);
        }

        if (entry.isFile() && entry.name.endsWith(".sql")) {
            return [entryPath];
        }

        return [];
    });
}
