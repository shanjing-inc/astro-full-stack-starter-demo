import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

const isCi = process.env.CI === "1" || process.env.CI === "true";
const isHuskyDisabled = process.env.HUSKY === "0";

if (isCi || isHuskyDisabled) {
    process.exit(0);
}

const gitCheck = spawnSync("git", ["--version"], {
    stdio: "ignore",
});

if (gitCheck.error || gitCheck.status !== 0) {
    process.exit(0);
}

if (!fs.existsSync(".git")) {
    process.exit(0);
}

const huskyInstall = spawnSync("husky", [], {
    stdio: "inherit",
    shell: process.platform === "win32",
});

if (huskyInstall.error) {
    if (huskyInstall.error.code === "ENOENT") {
        process.exit(0);
    }

    console.error(huskyInstall.error.message);
    process.exit(1);
}

process.exit(huskyInstall.status ?? 1);
