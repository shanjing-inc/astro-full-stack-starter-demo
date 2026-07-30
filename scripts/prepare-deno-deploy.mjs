import { access, chmod, cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

// Package prepare: bundle server/queues and copy runtime scripts when the published
// package version already includes the full scripts/runtime list.
await import("@shanjing/astro-full-stack-starter/deploy/deno");

// Project-local scripts/runtime is the source of truth for entry shell scripts.
// Re-sync after package prepare so standalone demo builds still emit start.sh when the
// installed package lags (e.g. registry 0.9.10 before start.sh was added to the copy list).
const rootDir = process.cwd();
const runtimeScriptDir = path.join(rootDir, "scripts/runtime");
const distScriptDir = path.join(rootDir, "dist/deno/scripts");
const startScriptPath = path.join(distScriptDir, "start.sh");

const shellScripts = (await readdir(runtimeScriptDir))
    .filter((fileName) => fileName.endsWith(".sh"))
    .sort();

if (shellScripts.length === 0) {
    throw new Error(`No *.sh scripts found in ${runtimeScriptDir}`);
}

if (!shellScripts.includes("start.sh")) {
    throw new Error(`Missing required start.sh in ${runtimeScriptDir}`);
}

await mkdir(distScriptDir, { recursive: true });

for (const fileName of shellScripts) {
    const targetPath = path.join(distScriptDir, fileName);
    await cp(path.join(runtimeScriptDir, fileName), targetPath);
    await chmod(targetPath, 0o755);
}

await access(startScriptPath);
