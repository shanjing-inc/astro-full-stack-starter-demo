import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const migrateShellPath = path.join(projectRoot, "scripts/migration/migrate.sh");
const tempDirs: string[] = [];

async function createTempDir() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "migration-shell-"));
    tempDirs.push(tempDir);

    return tempDir;
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((tempDir) => rm(tempDir, { force: true, recursive: true }))
    );
});

describe("migration shell wrapper", () => {
    it("passes Deno permissions, frozen lockfile, entry path, and dry-run flag", async () => {
        const tempDir = await createTempDir();
        const fakeDenoPath = path.join(tempDir, "deno");
        const capturePath = path.join(tempDir, "args.txt");

        await writeFile(
            fakeDenoPath,
            ["#!/bin/sh", "set -eu", 'printf \'%s\\n\' "$@" > "$CAPTURE_PATH"', ""].join("\n")
        );
        await chmod(fakeDenoPath, 0o755);

        const result = spawnSync("sh", [migrateShellPath, "--dry-run"], {
            encoding: "utf8",
            env: {
                ...process.env,
                CAPTURE_PATH: capturePath,
                DENO_BIN: fakeDenoPath,
            },
        });

        expect(result.status).toBe(0);

        const args = (await readFile(capturePath, "utf8")).trim().split("\n");
        const scriptDir = path.dirname(migrateShellPath);

        expect(args).toEqual([
            "run",
            "--no-npm",
            "--node-modules-dir=none",
            "--allow-env",
            "--allow-read",
            "--allow-net",
            `--lock=${path.join(scriptDir, "deno.lock")}`,
            "--frozen",
            path.join(scriptDir, "migrate.mjs"),
            "--dry-run",
        ]);
    });
});
