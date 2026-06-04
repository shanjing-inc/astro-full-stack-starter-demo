import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const workspaceRootDir = path.resolve(rootDir, "../..");
const starterPackageDir = path.join(workspaceRootDir, "packages/astro-full-stack-starter");
const starterPackageJsonPath = path.join(starterPackageDir, "package.json");
const starterIntegrationPath = path.join(starterPackageDir, "dist/integration.js");

if (existsSync(starterPackageJsonPath) && !existsSync(starterIntegrationPath)) {
    const result = spawnSync(
        "pnpm",
        ["--dir", workspaceRootDir, "--filter", "@shanjing/astro-full-stack-starter", "build"],
        {
            stdio: "inherit",
        }
    );

    if (result.status !== 0) {
        throw new Error(`Workspace starter build failed with exit code ${result.status ?? 1}.`);
    }
}
