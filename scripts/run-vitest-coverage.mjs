import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const coverageSummaryPath = path.join(rootDir, "coverage", "coverage-summary.json");
const coverageThreshold = 95;
const metrics = ["statements", "branches", "functions", "lines"];

async function runVitestCoverage() {
    const vitestBin = path.join(
        rootDir,
        "node_modules",
        ".bin",
        process.platform === "win32" ? "vitest.cmd" : "vitest"
    );

    return new Promise((resolve, reject) => {
        const child = spawn(vitestBin, ["run", "--coverage", "--configLoader", "runner"], {
            cwd: rootDir,
            stdio: "inherit",
        });

        child.on("error", reject);
        child.on("close", (code) => resolve(code ?? 1));
    });
}

async function readCoverageSummary() {
    try {
        const source = await readFile(coverageSummaryPath, "utf8");
        return JSON.parse(source);
    } catch (error) {
        console.error(
            `[coverage] Failed to read ${path.relative(rootDir, coverageSummaryPath)} for global threshold checks.`
        );
        console.error(error instanceof Error ? error.message : String(error));
        return null;
    }
}

function checkGlobalThresholds(summary) {
    let failed = false;
    const total = summary?.total;

    for (const metric of metrics) {
        const coverage = total?.[metric]?.pct;

        if (typeof coverage !== "number") {
            console.error(`[coverage] Missing total ${metric} coverage percentage.`);
            failed = true;
            continue;
        }

        if (coverage < coverageThreshold) {
            console.error(
                `ERROR: Coverage for ${metric} (${coverage}%) does not meet global threshold (${coverageThreshold}%)`
            );
            failed = true;
        }
    }

    return failed;
}

const vitestExitCode = await runVitestCoverage();
const coverageSummary = await readCoverageSummary();
const globalThresholdFailed = coverageSummary === null || checkGlobalThresholds(coverageSummary);

process.exit(vitestExitCode !== 0 || globalThresholdFailed ? 1 : 0);
