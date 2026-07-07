#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const migrationFolderPattern = /^\d{14}_.+/;
const denoNodeRuntimeBanner = [
    'import { createRequire as __createRequire } from "node:module";',
    'import { Buffer as __Buffer } from "node:buffer";',
    "const require = __createRequire(import.meta.url);",
    "globalThis.Buffer ??= __Buffer;",
    'globalThis.process={...globalThis.process,argv:globalThis.process?.argv??[],env:globalThis.Deno?.env?.toObject?.()??globalThis.process?.env??{},version:globalThis.process?.version??"v24.2.0",versions:globalThis.process?.versions??{node:"24.2.0"}};',
].join(" ");
const nodeBuiltinSpecifiers = new Set(
    builtinModules.flatMap((moduleName) => {
        const normalizedModuleName = moduleName.replace(/^node:/, "");

        return [normalizedModuleName, `node:${normalizedModuleName}`];
    })
);

const nodeBuiltinAliasPlugin = {
    name: "node-builtin-alias",
    setup(buildContext) {
        buildContext.onResolve({ filter: /.*/ }, (args) => {
            if (!nodeBuiltinSpecifiers.has(args.path)) {
                return;
            }

            const normalizedPath = args.path.replace(/^node:/, "");

            return {
                external: true,
                path: `node:${normalizedPath}`,
            };
        });
    },
};

class MigrationBundleError extends Error {
    constructor(message) {
        super(message);
        this.name = "MigrationBundleError";
    }
}

async function fileExists(filePath) {
    try {
        await stat(filePath);
        return true;
    } catch {
        return false;
    }
}

async function collectMigrationEntries(migrationsSourceDir) {
    const entries = await readdir(migrationsSourceDir, { withFileTypes: true });
    const migrationEntries = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        if (!migrationFolderPattern.test(entry.name)) {
            throw new MigrationBundleError(
                `Invalid migration folder name: ${entry.name}. Expected a 14 digit timestamp prefix.`
            );
        }

        const migrationSqlPath = path.join(migrationsSourceDir, entry.name, "migration.sql");

        if (await fileExists(migrationSqlPath)) {
            migrationEntries.push({
                name: entry.name,
                sourcePath: migrationSqlPath,
            });
        }
    }

    migrationEntries.sort((a, b) => a.name.localeCompare(b.name));

    if (migrationEntries.length === 0) {
        throw new MigrationBundleError(`No migration.sql files found in ${migrationsSourceDir}.`);
    }

    return migrationEntries;
}

/**
 * Copies the minimal Drizzle SQL files that customers need to run migrations.
 */
export async function copyMigrationSqlFiles({ bundleDir, migrationsSourceDir }) {
    const entries = await collectMigrationEntries(migrationsSourceDir);
    const targetDrizzleDir = path.join(bundleDir, "drizzle");
    const copiedEntries = [];

    await rm(targetDrizzleDir, { force: true, recursive: true });

    for (const entry of entries) {
        const targetDir = path.join(targetDrizzleDir, entry.name);
        const targetPath = path.join(targetDir, "migration.sql");

        await mkdir(targetDir, { recursive: true });
        await copyFile(entry.sourcePath, targetPath);
        copiedEntries.push({
            name: entry.name,
            sourcePath: entry.sourcePath,
            targetPath,
        });
    }

    return copiedEntries;
}

async function bundleMigrationRunner({ entryPath, outfile }) {
    await build({
        banner: {
            js: denoNodeRuntimeBanner,
        },
        bundle: true,
        conditions: ["module", "import", "default"],
        define: {
            "process.env.NODE_ENV": '"production"',
        },
        entryPoints: [entryPath],
        external: ["jsr:*"],
        format: "esm",
        legalComments: "none",
        mainFields: ["module", "main"],
        minify: false,
        outfile,
        platform: "node",
        plugins: [nodeBuiltinAliasPlugin],
        sourcemap: false,
        target: "node20",
        treeShaking: true,
    });
}

function createBundleReadme(copiedEntries) {
    const migrationList = copiedEntries.map((entry) => `- ${entry.name}`).join("\n");

    return [
        "# Deno MySQL demo 数据库迁移包",
        "",
        "本目录用于在业务 Docker 更新前执行 MySQL 数据库迁移。执行时只需要 Deno runtime、数据库网络访问和 `DATABASE_URL`。",
        "",
        "## 预检查",
        "",
        "```bash",
        'DATABASE_URL="mysql://user:password@host:3306/database" ./migrate.sh --dry-run',
        "```",
        "",
        "`--dry-run` 会连接数据库、读取 `__drizzle_migrations`、打印 pending migration 和 statement 数量，并跳过 SQL 执行。",
        "",
        "## 执行迁移",
        "",
        "```bash",
        'DATABASE_URL="mysql://user:password@host:3306/database" ./migrate.sh',
        "```",
        "",
        "runner 会按 `drizzle/` 目录名升序执行 `migration.sql`，并写入 `__drizzle_migrations`。",
        "",
        "## 发布规则",
        "",
        "- 更新前迁移只放兼容 schema 变更，例如新增表、新增 nullable 字段、新增带默认值字段和新增索引。",
        "- 多台服务器滚动更新期间，旧版和新版业务镜像共用同一个兼容 schema。",
        "- 删除字段、收紧 nullable、清理旧表和旧约束语义放到后续清理发布。",
        "- MySQL DDL 可能隐式提交。失败恢复依赖发布前备份、迁移拆分和人工确认。",
        "",
        "## 当前迁移",
        "",
        migrationList,
        "",
    ].join("\n");
}

async function writeMigrationReadme({ bundleDir, copiedEntries }) {
    await writeFile(path.join(bundleDir, "README.md"), createBundleReadme(copiedEntries));
}

async function generateDenoLock({ bundleDir, denoBin = "deno" }) {
    const denoLockPath = path.join(bundleDir, "deno.lock");
    const result = spawnSync(
        denoBin,
        [
            "cache",
            "--no-npm",
            "--node-modules-dir=none",
            `--lock=${denoLockPath}`,
            path.join(bundleDir, "migrate.mjs"),
        ],
        {
            encoding: "utf8",
            stdio: "pipe",
        }
    );

    if (result.error) {
        throw new MigrationBundleError(result.error.message);
    }

    if (result.status !== 0) {
        throw new MigrationBundleError(
            [
                "Failed to generate Deno lock for migration bundle.",
                result.stdout.trim(),
                result.stderr.trim(),
            ]
                .filter(Boolean)
                .join("\n")
        );
    }

    if (!(await fileExists(denoLockPath))) {
        await writeFile(
            denoLockPath,
            `${JSON.stringify(
                {
                    specifiers: {},
                    version: "5",
                },
                null,
                2
            )}\n`
        );
    }
}

/**
 * Builds dist/migration for customer-side database migration execution.
 */
export async function createMigrationBundle(options = {}) {
    const rootDir = options.rootDir ?? process.cwd();
    const bundleDir = options.bundleDir ?? path.join(rootDir, "dist/migration");
    const migrationsSourceDir = options.migrationsSourceDir ?? path.join(rootDir, "drizzle");
    const runnerEntryPath =
        options.runnerEntryPath ?? path.join(rootDir, "scripts/migration/migrate.ts");
    const shellSourcePath =
        options.shellSourcePath ?? path.join(rootDir, "scripts/migration/migrate.sh");
    const logger = options.logger ?? console;

    await rm(bundleDir, { force: true, recursive: true });
    await mkdir(bundleDir, { recursive: true });

    const copiedEntries = await copyMigrationSqlFiles({
        bundleDir,
        migrationsSourceDir,
    });

    await bundleMigrationRunner({
        entryPath: runnerEntryPath,
        outfile: path.join(bundleDir, "migrate.mjs"),
    });
    await copyFile(shellSourcePath, path.join(bundleDir, "migrate.sh"));
    await chmod(path.join(bundleDir, "migrate.sh"), 0o755);
    await writeMigrationReadme({
        bundleDir,
        copiedEntries,
    });

    if (options.generateDenoLock !== false) {
        await generateDenoLock({
            bundleDir,
            denoBin: options.denoBin,
        });
    } else {
        await writeFile(path.join(bundleDir, "deno.lock"), "{}\n");
    }

    logger.info(`[create-migration-bundle] wrote ${path.relative(rootDir, bundleDir)}`);
    logger.info(`[create-migration-bundle] migrations: ${copiedEntries.length}`);

    return {
        bundleDir,
        copiedEntries,
    };
}

async function main() {
    await createMigrationBundle();
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (entryPath === fileURLToPath(import.meta.url)) {
    try {
        await main();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.error(`[create-migration-bundle] ${message}`);
        process.exit(1);
    }
}
