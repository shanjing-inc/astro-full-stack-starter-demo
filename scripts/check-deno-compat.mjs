import { glob, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const runtimeGlobs = ["src/**/*.{astro,js,jsx,mjs,ts,tsx}"];

const checks = [
    {
        id: "node-builtins",
        message: "运行时代码不要直接导入 Node 内建模块；请改用 Web API 或把逻辑移到构建脚本。",
        patterns: [
            /\bfrom\s+["']node:[^"']+["']/g,
            /\bimport\s+["']node:[^"']+["']/g,
            /\brequire\(\s*["']node:[^"']+["']\s*\)/g,
        ],
    },
    {
        id: "node-globals",
        message: "运行时代码不要依赖 Node 全局对象；否则本地 Node 开发可能掩盖 Deno 部署问题。",
        patterns: [/\bprocess\./g, /\bBuffer\b/g, /\b__dirname\b/g, /\b__filename\b/g],
    },
    {
        id: "deno-globals",
        message: "运行时代码不要直接依赖 Deno 全局对象；否则本地 Node 开发无法等价验证。",
        patterns: [/\bDeno\./g],
    },
];

function toPosixPath(value) {
    return value.replaceAll("\\", "/");
}

function getLineNumber(source, index) {
    let line = 1;

    for (let position = 0; position < index; position += 1) {
        if (source.charCodeAt(position) === 10) {
            line += 1;
        }
    }

    return line;
}

async function collectRuntimeFiles() {
    const runtimeFiles = new Set();

    for (const pattern of runtimeGlobs) {
        for await (const relativePath of glob(pattern, { cwd: rootDir })) {
            runtimeFiles.add(path.join(rootDir, relativePath));
        }
    }

    return [...runtimeFiles];
}

async function main() {
    const runtimeFiles = await collectRuntimeFiles();

    const findings = [];

    for (const filePath of runtimeFiles) {
        const source = await readFile(filePath, "utf8");

        for (const check of checks) {
            for (const pattern of check.patterns) {
                pattern.lastIndex = 0;

                for (const match of source.matchAll(pattern)) {
                    const index = match.index ?? 0;
                    const line = getLineNumber(source, index);

                    findings.push({
                        checkId: check.id,
                        filePath,
                        line,
                        message: check.message,
                        snippet: match[0],
                    });
                }
            }
        }
    }

    if (findings.length === 0) {
        console.log(
            "[check-deno-compat] OK: runtime source has no obvious Node/Deno-only bindings."
        );
        console.log(
            "[check-deno-compat] Local dev can stay on Node, while deploy artifacts target Deno."
        );
        console.log();
        return;
    }

    console.error("[check-deno-compat] Found runtime compatibility risks:");

    for (const finding of findings) {
        const relativePath = toPosixPath(path.relative(rootDir, finding.filePath));
        console.error(`- ${relativePath}:${finding.line} [${finding.checkId}] ${finding.message}`);
        console.error(`  matched: ${finding.snippet}`);
    }

    process.exitCode = 1;
}

await main();
