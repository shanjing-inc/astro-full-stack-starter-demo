import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "mysql2/promise";

const migrationsTableName = "__drizzle_migrations";
const statementBreakpoint = "--> statement-breakpoint";
const mysqlPoolQueryOptions = [
    "connectionLimit",
    "drizzleMode",
    "idleTimeout",
    "maxIdle",
    "queueLimit",
    "resetOnRelease",
    "waitForConnections",
];

export interface MigrationFile {
    folderMillis: number;
    hash: string;
    name: string;
    path: string;
    statements: string[];
}

export interface MigrationRecord {
    created_at: bigint | number | string | null;
    hash: string;
    id: number;
    name?: string | null;
}

export interface DatabaseTargetSummary {
    database: string;
    host: string;
    port: string;
    protocol: string;
    username: "<hidden>" | "(empty)";
}

export interface MigrationDatabaseConnection {
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    end(): Promise<void>;
    execute(sql: string, params?: unknown[]): Promise<readonly [unknown, unknown]>;
    query<T = Record<string, unknown>>(
        sql: string,
        params?: unknown[]
    ): Promise<readonly [T[], unknown]>;
    rollback(): Promise<void>;
}

export interface MigrationLogger {
    error(message: string): void;
    info(message: string): void;
}

export interface RunMigrationPlanOptions {
    connection: MigrationDatabaseConnection;
    databaseUrl: string;
    dryRun?: boolean;
    logger?: MigrationLogger;
    migrationsDir: string;
}

export interface RunMigrationPlanResult {
    appliedMigrations: MigrationRecord[];
    dryRun: boolean;
    localMigrations: MigrationFile[];
    pendingMigrations: MigrationFile[];
}

interface MigrationCliArgs {
    dryRun: boolean;
    help: boolean;
}

type RuntimeGlobal = typeof globalThis & {
    Deno?: {
        args?: string[];
        env?: {
            get(name: string): string | undefined;
            toObject?: () => Record<string, string>;
        };
        exit?: (code: number) => never;
    };
};

export class MigrationRunnerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MigrationRunnerError";
    }
}

/**
 * Matches Drizzle's migration SQL splitter.
 */
export function splitMigrationStatements(sql: string) {
    return sql.split(statementBreakpoint);
}

/**
 * Converts the first 14 digits of a Drizzle migration folder to UTC millis.
 */
export function formatMigrationTimestampToMillis(migrationName: string) {
    const dateStr = migrationName.slice(0, 14);

    if (!/^\d{14}$/.test(dateStr)) {
        throw new MigrationRunnerError(
            `Invalid migration folder name: ${migrationName}. Expected a 14 digit timestamp prefix.`
        );
    }

    const year = Number.parseInt(dateStr.slice(0, 4), 10);
    const month = Number.parseInt(dateStr.slice(4, 6), 10) - 1;
    const day = Number.parseInt(dateStr.slice(6, 8), 10);
    const hour = Number.parseInt(dateStr.slice(8, 10), 10);
    const minute = Number.parseInt(dateStr.slice(10, 12), 10);
    const second = Number.parseInt(dateStr.slice(12, 14), 10);

    return Date.UTC(year, month, day, hour, minute, second);
}

async function fileExists(filePath: string) {
    try {
        await stat(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Reads Drizzle migration folders using the same ordering and hash strategy as Drizzle.
 */
export async function readMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    const migrationEntries = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        const migrationPath = path.join(migrationsDir, entry.name, "migration.sql");

        if (await fileExists(migrationPath)) {
            migrationEntries.push({
                name: entry.name,
                path: migrationPath,
            });
        }
    }

    migrationEntries.sort((a, b) => a.name.localeCompare(b.name));

    const migrations = [];

    for (const migrationEntry of migrationEntries) {
        const sql = await readFile(migrationEntry.path, "utf8");

        migrations.push({
            folderMillis: formatMigrationTimestampToMillis(migrationEntry.name),
            hash: createHash("sha256").update(sql).digest("hex"),
            name: migrationEntry.name,
            path: migrationEntry.path,
            statements: splitMigrationStatements(sql),
        });
    }

    return migrations;
}

/**
 * Builds a log-safe database target summary from DATABASE_URL.
 */
export function createDatabaseTargetSummary(databaseUrl: string): DatabaseTargetSummary {
    let url: URL;

    try {
        url = new URL(databaseUrl);
    } catch {
        throw new MigrationRunnerError("DATABASE_URL must be a valid MySQL URL.");
    }

    return {
        database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "(empty)",
        host: url.hostname || "localhost",
        port: url.port || "3306",
        protocol: url.protocol.replace(/:$/, "") || "mysql",
        username: url.username ? "<hidden>" : "(empty)",
    };
}

function formatTargetSummary(summary: DatabaseTargetSummary) {
    return [
        `protocol=${summary.protocol}`,
        `host=${summary.host}`,
        `port=${summary.port}`,
        `database=${summary.database}`,
        `username=${summary.username}`,
    ].join(" ");
}

function normalizeLegacyCreatedAt(value: MigrationRecord["created_at"]) {
    const stringified = String(value ?? "");

    if (stringified.length > 3) {
        return Number(`${stringified.slice(0, -3)}000`);
    }

    return Number(stringified);
}

function buildLocalMigrationIndexes(localMigrations: MigrationFile[]) {
    const sortedMigrations = [...localMigrations].sort((a, b) => {
        if (a.folderMillis !== b.folderMillis) {
            return a.folderMillis - b.folderMillis;
        }

        return a.name.localeCompare(b.name);
    });
    const byMillis = new Map<number, MigrationFile[]>();
    const byHash = new Map<string, MigrationFile>();

    for (const migration of sortedMigrations) {
        const migrations = byMillis.get(migration.folderMillis) ?? [];

        migrations.push(migration);
        byMillis.set(migration.folderMillis, migrations);
        byHash.set(migration.hash, migration);
    }

    return {
        byHash,
        byMillis,
    };
}

function resolveLegacyMigrationName(
    dbMigration: MigrationRecord,
    localMigrations: MigrationFile[]
) {
    const { byHash, byMillis } = buildLocalMigrationIndexes(localMigrations);
    const candidates = byMillis.get(normalizeLegacyCreatedAt(dbMigration.created_at));

    if (candidates?.length === 1) {
        return candidates[0]?.name;
    }

    if (candidates && candidates.length > 1) {
        return candidates.find((candidate) => candidate.hash === dbMigration.hash)?.name;
    }

    return byHash.get(dbMigration.hash)?.name;
}

function resolveAppliedMigrationNames(
    localMigrations: MigrationFile[],
    dbMigrations: MigrationRecord[]
) {
    const names = new Set<string>();
    const unmatchedIds = [];

    for (const dbMigration of dbMigrations) {
        if (dbMigration.name) {
            names.add(dbMigration.name);
            continue;
        }

        const legacyName = resolveLegacyMigrationName(dbMigration, localMigrations);

        if (legacyName) {
            names.add(legacyName);
            continue;
        }

        unmatchedIds.push(dbMigration.id);
    }

    if (unmatchedIds.length > 0) {
        throw new MigrationRunnerError(
            [
                "While reading the database migrations table, some applied rows do not match local migrations.",
                `Unmatched migration ids: ${unmatchedIds.join(", ")}.`,
            ].join(" ")
        );
    }

    return names;
}

/**
 * Mirrors Drizzle's pending migration rule based on migration folder names.
 */
export function getPendingMigrations(
    localMigrations: MigrationFile[],
    dbMigrations: MigrationRecord[]
) {
    const appliedNames = resolveAppliedMigrationNames(localMigrations, dbMigrations);

    return localMigrations.filter((migration) => !appliedNames.has(migration.name));
}

async function queryRows<T>(
    connection: MigrationDatabaseConnection,
    sql: string,
    params: unknown[] = []
) {
    const [rows] = await connection.query<T>(sql, params);

    return rows;
}

async function migrationTableExists(connection: MigrationDatabaseConnection) {
    const rows = await queryRows(
        connection,
        [
            "SELECT 1 AS found FROM information_schema.tables",
            "WHERE table_name = ?",
            "AND table_schema = DATABASE()",
        ].join(" "),
        [migrationsTableName]
    );

    return rows.length > 0;
}

async function readMigrationTableColumns(connection: MigrationDatabaseConnection) {
    const rows = await queryRows<{ column_name: string }>(
        connection,
        [
            "SELECT column_name AS column_name FROM information_schema.columns",
            "WHERE table_name = ?",
            "AND table_schema = DATABASE()",
            "ORDER BY ordinal_position",
        ].join(" "),
        [migrationsTableName]
    );

    return rows.map((row) => row.column_name);
}

async function readMigrationRows(
    connection: MigrationDatabaseConnection,
    hasNameColumn: boolean
): Promise<MigrationRecord[]> {
    if (hasNameColumn) {
        return queryRows<MigrationRecord>(
            connection,
            "SELECT id, hash, created_at, name FROM `__drizzle_migrations`"
        );
    }

    const rows = await queryRows<Omit<MigrationRecord, "name">>(
        connection,
        "SELECT id, hash, created_at FROM `__drizzle_migrations`"
    );

    return rows.map((row) => ({
        ...row,
        name: null,
    }));
}

async function createMigrationTable(connection: MigrationDatabaseConnection) {
    await connection.execute(
        [
            "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (",
            "id SERIAL PRIMARY KEY,",
            "hash TEXT NOT NULL,",
            "created_at BIGINT,",
            "name TEXT,",
            "applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            ")",
        ].join(" ")
    );
}

async function upgradeMigrationTableIfNeeded(
    connection: MigrationDatabaseConnection,
    localMigrations: MigrationFile[],
    columns: string[]
) {
    const hasNameColumn = columns.includes("name");
    const hasAppliedAtColumn = columns.includes("applied_at");
    const legacyRows = hasNameColumn ? [] : await readMigrationRows(connection, false);
    const backfillEntries = legacyRows.map((row) => ({
        id: row.id,
        name: resolveLegacyMigrationName(row, localMigrations),
    }));
    const unmatchedEntries = backfillEntries.filter((entry) => !entry.name);

    if (unmatchedEntries.length > 0) {
        throw new MigrationRunnerError(
            `Cannot upgrade ${migrationsTableName}; unmatched migration ids: ${unmatchedEntries
                .map((entry) => entry.id)
                .join(", ")}.`
        );
    }

    if (!hasNameColumn) {
        await connection.execute("ALTER TABLE `__drizzle_migrations` ADD `name` text");
    }

    if (!hasAppliedAtColumn) {
        await connection.execute(
            "ALTER TABLE `__drizzle_migrations` ADD `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        );
    }

    for (const entry of backfillEntries) {
        await connection.execute(
            "UPDATE `__drizzle_migrations` SET `name` = ?, `applied_at` = NULL WHERE `id` = ?",
            [entry.name, entry.id]
        );
    }
}

async function readDatabaseMigrations(
    connection: MigrationDatabaseConnection,
    localMigrations: MigrationFile[],
    allowWrites: boolean
) {
    if (!(await migrationTableExists(connection))) {
        if (allowWrites) {
            await createMigrationTable(connection);
        }

        return [];
    }

    const columns = await readMigrationTableColumns(connection);

    if (allowWrites) {
        await upgradeMigrationTableIfNeeded(connection, localMigrations, columns);

        return readMigrationRows(connection, true);
    }

    return readMigrationRows(connection, columns.includes("name"));
}

async function executePendingMigrations(
    connection: MigrationDatabaseConnection,
    pendingMigrations: MigrationFile[],
    logger: MigrationLogger
) {
    await connection.beginTransaction();

    try {
        for (const migration of pendingMigrations) {
            logger.info(`[migrate] applying ${migration.name}`);

            for (const [index, statement] of migration.statements.entries()) {
                logger.info(
                    `[migrate] statement ${index + 1}/${migration.statements.length} ${migration.name}`
                );

                try {
                    await connection.query(statement);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);

                    throw new MigrationRunnerError(
                        `[migrate] failed ${migration.name} statement ${index + 1}/${migration.statements.length}: ${message}`
                    );
                }
            }

            await connection.execute(
                "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`, `name`) VALUES (?, ?, ?)",
                [migration.hash, migration.folderMillis, migration.name]
            );
            logger.info(`[migrate] completed ${migration.name}`);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
}

/**
 * Runs the migration plan against an existing MySQL connection.
 */
export async function runMigrationPlan({
    connection,
    databaseUrl,
    dryRun = false,
    logger = console,
    migrationsDir,
}: RunMigrationPlanOptions): Promise<RunMigrationPlanResult> {
    const localMigrations = await readMigrationFiles(migrationsDir);
    const targetSummary = createDatabaseTargetSummary(databaseUrl);

    logger.info(`[migrate] mode: ${dryRun ? "dry-run" : "apply"}`);
    logger.info(`[migrate] target: ${formatTargetSummary(targetSummary)}`);
    logger.info(`[migrate] local migrations: ${localMigrations.length}`);

    const appliedMigrations = await readDatabaseMigrations(connection, localMigrations, !dryRun);
    const pendingMigrations = getPendingMigrations(localMigrations, appliedMigrations);

    logger.info(`[migrate] applied migrations: ${appliedMigrations.length}`);
    logger.info(`[migrate] pending migrations: ${pendingMigrations.length}`);

    for (const migration of pendingMigrations) {
        logger.info(
            `[migrate] pending ${migration.name} statements=${migration.statements.length}`
        );
    }

    if (dryRun) {
        logger.info("[migrate] dry-run complete. no SQL statements were executed.");

        return {
            appliedMigrations,
            dryRun,
            localMigrations,
            pendingMigrations,
        };
    }

    if (pendingMigrations.length === 0) {
        logger.info("[migrate] database schema is already up to date.");

        return {
            appliedMigrations,
            dryRun,
            localMigrations,
            pendingMigrations,
        };
    }

    await executePendingMigrations(connection, pendingMigrations, logger);
    logger.info("[migrate] migration complete.");

    return {
        appliedMigrations,
        dryRun,
        localMigrations,
        pendingMigrations,
    };
}

export const migrationHelpText = [
    "Usage:",
    '  DATABASE_URL="mysql://user:password@host:3306/database" ./migrate.sh [--dry-run]',
    "",
    "Options:",
    "  --dry-run   Connect to MySQL, print pending migrations, and skip SQL execution.",
    "  --help      Print this help message.",
    "",
].join("\n");

export function parseMigrationArgs(args: string[]): MigrationCliArgs {
    const parsed: MigrationCliArgs = {
        dryRun: false,
        help: false,
    };

    for (const arg of args) {
        if (arg === "--dry-run") {
            parsed.dryRun = true;
            continue;
        }

        if (arg === "--help" || arg === "-h") {
            parsed.help = true;
            continue;
        }

        throw new MigrationRunnerError(`Unknown migration option: ${arg}`);
    }

    return parsed;
}

function readRuntimeArgs() {
    const runtimeGlobal = globalThis as RuntimeGlobal;

    if (Array.isArray(runtimeGlobal.Deno?.args)) {
        return runtimeGlobal.Deno.args;
    }

    return process.argv.slice(2);
}

function readRuntimeEnv(name: string) {
    const runtimeGlobal = globalThis as RuntimeGlobal;

    return runtimeGlobal.Deno?.env?.get(name) ?? process.env[name];
}

function createMysqlConnectionUri(databaseUrl: string) {
    const url = new URL(databaseUrl);

    for (const option of mysqlPoolQueryOptions) {
        url.searchParams.delete(option);
    }

    return url.toString();
}

function exitRuntime(code: number): never {
    const runtimeGlobal = globalThis as RuntimeGlobal;

    if (typeof runtimeGlobal.Deno?.exit === "function") {
        runtimeGlobal.Deno.exit(code);
    }

    process.exit(code);
}

export async function runCli(args = readRuntimeArgs()) {
    const parsedArgs = parseMigrationArgs(args);

    if (parsedArgs.help) {
        console.log(migrationHelpText);
        return;
    }

    const databaseUrl = readRuntimeEnv("DATABASE_URL")?.trim();

    if (!databaseUrl) {
        throw new MigrationRunnerError("Missing required environment variable: DATABASE_URL.");
    }

    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const migrationsDir = path.join(scriptDir, "drizzle");
    const connection = (await createConnection(
        createMysqlConnectionUri(databaseUrl)
    )) as unknown as MigrationDatabaseConnection;

    try {
        await runMigrationPlan({
            connection,
            databaseUrl,
            dryRun: parsedArgs.dryRun,
            migrationsDir,
        });
    } finally {
        await connection.end();
    }
}

if ((import.meta as ImportMeta & { main?: boolean }).main) {
    try {
        await runCli();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.error(`[migrate] ${message}`);
        exitRuntime(1);
    }
}
