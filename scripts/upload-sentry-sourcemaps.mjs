import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const distCloudflareDir = path.join(rootDir, "dist");
const sourceDir = path.join(rootDir, "src");
const sentryCliPackage = "@sentry/cli@2.58.5";
const requiredEnvNames = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT", "SENTRY_RELEASE"];
const sourceContextExtensions = ["ts", "tsx", "astro", "js", "jsx", "mjs", "cjs"];
const defaultSourcemapUrlPrefixes = ["app:///dist/cloudflare", "~/dist/cloudflare"];

function readRequiredEnv(name) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`${name} is required.`);
    }

    return value;
}

async function assertDistReady() {
    await access(path.join(distCloudflareDir, "server/entry.mjs"));
    await access(path.join(distCloudflareDir, "server/entry.mjs.map"));
    await access(sourceDir);
}

function createPnpmDlxArgs() {
    return ["dlx", sentryCliPackage];
}

function createReleaseArgs(env, dist) {
    return [
        "--org",
        env.SENTRY_ORG,
        "--project",
        env.SENTRY_PROJECT,
        "--release",
        env.SENTRY_RELEASE,
        "--dist",
        dist,
    ];
}

function runPnpm(args) {
    return new Promise((resolve, reject) => {
        const child = spawn("pnpm", args, {
            env: process.env,
            stdio: "inherit",
        });

        child.on("error", reject);
        child.on("exit", (code, signal) => {
            if (signal) {
                process.kill(process.pid, signal);
                return;
            }

            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`pnpm ${args.join(" ")} exited with code ${code ?? 1}.`));
        });
    });
}

async function uploadSourcemaps(env, dist, urlPrefix) {
    await runPnpm([
        ...createPnpmDlxArgs(),
        "sourcemaps",
        "upload",
        ...createReleaseArgs(env, dist),
        "--url-prefix",
        urlPrefix,
        "--strip-common-prefix",
        "--validate",
        "--wait",
        distCloudflareDir,
    ]);
}

async function uploadSourceContext(env, dist, urlPrefix) {
    await runPnpm([
        ...createPnpmDlxArgs(),
        "releases",
        "files",
        "upload",
        ...createReleaseArgs(env, dist),
        sourceDir,
        "--url-prefix",
        urlPrefix,
        "--wait",
        ...sourceContextExtensions.flatMap((extension) => ["--ext", extension]),
    ]);
}

async function main() {
    const env = Object.fromEntries(requiredEnvNames.map((name) => [name, readRequiredEnv(name)]));
    const dist = process.env.SENTRY_DIST?.trim() || "cloudflare";
    const urlPrefixes = process.env.SENTRY_URL_PREFIX?.trim()
        ? [process.env.SENTRY_URL_PREFIX.trim()]
        : defaultSourcemapUrlPrefixes;
    const sourceContextPrefix =
        process.env.SENTRY_SOURCE_URL_PREFIX?.trim() || "app:///dist/cloudflare/server/src";

    await assertDistReady();

    for (const urlPrefix of urlPrefixes) {
        await uploadSourcemaps(env, dist, urlPrefix);
    }

    await uploadSourceContext(env, dist, sourceContextPrefix);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
