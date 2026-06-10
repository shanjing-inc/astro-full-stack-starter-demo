#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PRETTIER_CHUNK_SIZE = 80;
const PROJECT_WORKSPACE_PATH = "projects/deno-mysql-demo";
const PROJECT_CHECK_SCRIPT = "deno-mysql-demo:check";
const STARTER_PACKAGE_NAME = "@shanjing/astro-full-stack-starter";
const DOC_EXTENSIONS = new Set([".html", ".md", ".mdx", ".txt"]);
const CODE_EXTENSIONS = new Set([
    ".astro",
    ".cjs",
    ".css",
    ".graphql",
    ".js",
    ".jsx",
    ".mjs",
    ".scss",
    ".sh",
    ".sql",
    ".ts",
    ".tsx",
]);
const CONFIG_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml"]);
const CONFIG_BASENAMES = new Set([
    ".env.example",
    ".eslintignore",
    ".gitignore",
    ".npmrc",
    ".prettierignore",
    ".prettierrc",
    "astro.config.mjs",
    "codegen.yml",
    "Dockerfile",
    "Dockerfile.dockerignore",
    "docker-compose.yml",
    "drizzle.config.ts",
    "eslint.config.mjs",
    "package.json",
    "playwright.config.ts",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tailwind.config.js",
    "tailwind.config.mjs",
    "tsconfig.json",
    "vite.config.ts",
    "vitest.config.ts",
    "wrangler.jsonc",
]);

function toPosixPath(filePath) {
    return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function toProjectRelativePath(filePath) {
    const normalizedPath = toPosixPath(
        path.isAbsolute(filePath) ? path.relative(process.cwd(), filePath) : filePath
    );

    if (normalizedPath.startsWith(`${PROJECT_WORKSPACE_PATH}/`)) {
        return normalizedPath.slice(PROJECT_WORKSPACE_PATH.length + 1);
    }

    return normalizedPath;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function isMonorepoSourceMode() {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const monorepoRoot = path.resolve(process.cwd(), "../..");
    const starterPackageJsonPath = path.join(
        monorepoRoot,
        "packages/astro-full-stack-starter/package.json"
    );

    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(starterPackageJsonPath)) {
        return false;
    }

    const packageJson = readJson(packageJsonPath);
    const starterDependency = packageJson.dependencies?.[STARTER_PACKAGE_NAME];

    return typeof starterDependency === "string" && starterDependency.startsWith("workspace:");
}

function toPrettierPath(filePath, useMonorepoRoot) {
    const normalizedPath = toPosixPath(filePath);

    if (!useMonorepoRoot || normalizedPath.startsWith(`${PROJECT_WORKSPACE_PATH}/`)) {
        return normalizedPath;
    }

    return `${PROJECT_WORKSPACE_PATH}/${normalizedPath}`;
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd,
        stdio: "inherit",
        shell: process.platform === "win32",
    });

    if (result.error && result.status === null) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

function readStagedFiles() {
    const fallbackFiles = process.argv.slice(2).map((filePath) => toProjectRelativePath(filePath));
    const result = spawnSync(
        "git",
        ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
        {
            encoding: "utf-8",
        }
    );

    if (result.error && result.status === null) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.stderr.write(result.stderr ?? "");
        process.exit(result.status ?? 1);
    }

    const stagedFiles = result.stdout.split("\0").filter(Boolean).map(toPosixPath);

    if (!isMonorepoSourceMode()) {
        return stagedFiles.length > 0
            ? stagedFiles.map((filePath) => toProjectRelativePath(filePath))
            : fallbackFiles;
    }

    const sourceFiles = stagedFiles
        .filter((filePath) => filePath.startsWith(`${PROJECT_WORKSPACE_PATH}/`))
        .map((filePath) => filePath.slice(PROJECT_WORKSPACE_PATH.length + 1));
    return sourceFiles.length > 0 ? sourceFiles : fallbackFiles;
}

function isDocumentationFile(filePath) {
    const extension = path.posix.extname(filePath).toLowerCase();

    return DOC_EXTENSIONS.has(extension);
}

function isQualityRelevant(filePath) {
    if (isDocumentationFile(filePath)) {
        return false;
    }

    const basename = path.posix.basename(filePath);
    const extension = path.posix.extname(filePath).toLowerCase();

    return (
        CODE_EXTENSIONS.has(extension) ||
        CONFIG_EXTENSIONS.has(extension) ||
        CONFIG_BASENAMES.has(basename) ||
        filePath.startsWith(".husky/") ||
        filePath.startsWith("scripts/") ||
        filePath.includes("/scripts/") ||
        filePath.includes("/src/") ||
        filePath.includes("/tests/")
    );
}

function runPrettier(files) {
    const useMonorepoRoot = isMonorepoSourceMode();
    const cwd = useMonorepoRoot ? path.resolve(process.cwd(), "../..") : process.cwd();
    const prettierFiles = files.map((filePath) => toPrettierPath(filePath, useMonorepoRoot));

    for (let index = 0; index < files.length; index += PRETTIER_CHUNK_SIZE) {
        const chunk = prettierFiles.slice(index, index + PRETTIER_CHUNK_SIZE);

        run("pnpm", ["exec", "prettier", "--check", "--ignore-unknown", "--", ...chunk], {
            cwd,
        });
    }
}

function runProjectCheck() {
    if (isMonorepoSourceMode()) {
        run("pnpm", [PROJECT_CHECK_SCRIPT], {
            cwd: path.resolve(process.cwd(), "../.."),
        });
        return;
    }

    run("pnpm", ["check"]);
}

const stagedFiles = readStagedFiles();

if (stagedFiles.length === 0) {
    console.log("没有暂存文件，跳过 pre-commit 检查。");
    process.exit(0);
}

runPrettier(stagedFiles);

if (!stagedFiles.some((filePath) => isQualityRelevant(filePath))) {
    console.log("未检测到代码或配置变更，跳过项目级 check。");
    process.exit(0);
}

runProjectCheck();
