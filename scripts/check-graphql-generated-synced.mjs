#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const GENERATED_PATHS = ["src/graphql/generated"];

function runGit(args) {
    return spawnSync("git", args, {
        encoding: "utf-8",
    });
}

const statusResult = runGit([
    "status",
    "--porcelain",
    "--untracked-files=all",
    "--",
    ...GENERATED_PATHS,
]);

if (statusResult.error && statusResult.status === null) {
    console.error(statusResult.error.message);
    process.exit(1);
}

if (statusResult.status !== 0) {
    process.stderr.write(statusResult.stderr ?? "");
    process.exit(statusResult.status ?? 1);
}

const dirty = (statusResult.stdout ?? "").trim();

if (!dirty) {
    process.exit(0);
}

console.error("");
console.error(
    "GraphQL codegen 产物与源码不同步：`pnpm codegen` 后 `src/graphql/generated` 仍有未提交变更。"
);
console.error("请执行：");
console.error("  pnpm codegen");
console.error("  git add src/graphql/generated");
console.error("并将 generated 与 schema/operation 改动放在同一 MR/提交中。");
console.error("");
console.error(dirty);
console.error("");
process.exit(1);
