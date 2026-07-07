import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { copyMigrationSqlFiles } from "../../../scripts/create-migration-bundle.mjs";

const tempDirs: string[] = [];

async function createTempDir() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-bundle-"));
    tempDirs.push(tempDir);

    return tempDir;
}

async function writeMigration(sourceDir: string, name: string, sql: string) {
    const migrationDir = path.join(sourceDir, name);

    await mkdir(migrationDir, { recursive: true });
    await writeFile(path.join(migrationDir, "migration.sql"), sql);
    await writeFile(path.join(migrationDir, "snapshot.json"), "{}\n");
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((tempDir) => rm(tempDir, { force: true, recursive: true }))
    );
});

describe("migration bundle generator", () => {
    it("copies only drizzle migration SQL files into the bundle", async () => {
        const rootDir = await createTempDir();
        const sourceDir = path.join(rootDir, "drizzle");
        const bundleDir = path.join(rootDir, "dist/migration");

        await writeMigration(sourceDir, "20260425054547_brave_hawkeye", "SELECT 2;\n");
        await writeMigration(sourceDir, "20260414085932_naive_harpoon", "SELECT 1;\n");

        const copied = await copyMigrationSqlFiles({
            bundleDir,
            migrationsSourceDir: sourceDir,
        });

        expect(copied.map((entry) => entry.name)).toEqual([
            "20260414085932_naive_harpoon",
            "20260425054547_brave_hawkeye",
        ]);
        await expect(
            readFile(
                path.join(bundleDir, "drizzle/20260414085932_naive_harpoon/migration.sql"),
                "utf8"
            )
        ).resolves.toBe("SELECT 1;\n");
        await expect(
            readFile(
                path.join(bundleDir, "drizzle/20260414085932_naive_harpoon/snapshot.json"),
                "utf8"
            )
        ).rejects.toThrow();
    });
});
