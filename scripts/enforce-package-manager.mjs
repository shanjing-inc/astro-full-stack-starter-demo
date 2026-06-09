import fs from "fs";
import path from "path";

const userAgent = process.env.npm_config_user_agent ?? "";
const execPath = process.env.npm_execpath ?? "";
function readPackageManagerFromPackageJson() {
    try {
        const packageJsonPath = path.join(process.cwd(), "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

        if (
            typeof packageJson.packageManager === "string" &&
            packageJson.packageManager.length > 0
        ) {
            return packageJson.packageManager;
        }
    } catch {
        return null;
    }

    return null;
}

function resolvePackageManager() {
    const envPackageManager = process.env.npm_package_packageManager;

    if (envPackageManager?.includes("@")) {
        return envPackageManager;
    }

    return readPackageManagerFromPackageJson() ?? envPackageManager ?? "pnpm";
}

const packageManager = resolvePackageManager();
const nodeMajorVersion = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
const needsCorepackInstall = Number.isFinite(nodeMajorVersion) && nodeMajorVersion >= 25;

function isPnpmInvocation() {
    if (userAgent.startsWith("pnpm/")) {
        return true;
    }

    return execPath.toLowerCase().includes("pnpm");
}

function isCorepackManaged() {
    const corepackHome = process.env.COREPACK_HOME;
    const xdgCacheHome = process.env.XDG_CACHE_HOME;
    const localAppData = process.env.LOCALAPPDATA;
    const home = process.env.HOME;

    const possibleCachePaths = [
        corepackHome,
        xdgCacheHome ? `${xdgCacheHome}/node/corepack` : null,
        localAppData ? `${localAppData}/node/corepack` : null,
        home ? `${home}/.cache/node/corepack` : null,
    ].filter(Boolean);

    const normalizedExecPath = execPath.toLowerCase();

    for (const cachePath of possibleCachePaths) {
        if (normalizedExecPath.includes(cachePath.toLowerCase())) {
            return true;
        }
    }

    if (normalizedExecPath.includes("corepack")) {
        return true;
    }

    return false;
}

function checkPnpmStructure() {
    try {
        const nodeModulesPath = path.join(process.cwd(), "node_modules", ".pnpm");
        return fs.existsSync(nodeModulesPath);
    } catch {
        return false;
    }
}

if (!isPnpmInvocation()) {
    const detectedClient = userAgent.split(" ")[0] || execPath || "unknown";

    console.error("");
    console.error("ERROR: 依赖安装仅允许使用 pnpm。");
    console.error(`Detected package manager: ${detectedClient}`);
    console.error(`Required package manager: ${packageManager}`);
    console.error("");
    console.error("请改用以下命令：");
    console.error("    pnpm install");
    console.error("");
    console.error("项目规则已禁止使用 npm install 或 yarn install。");
    console.error("");

    process.exit(1);
}

const hasPnpmStructure = checkPnpmStructure();
if (hasPnpmStructure && !isCorepackManaged()) {
    console.error("");
    console.error("ERROR: 项目要求使用 Corepack 管理 pnpm 版本。");
    console.error("");
    console.error("当前 pnpm 不是由 Corepack 管理，可能导致版本不一致。");
    console.error("");
    console.error("请按以下步骤切换到 Corepack 管理的 pnpm：");
    console.error("");
    console.error("1. 请确认当前环境使用 Node.js >=24.0.0：");
    console.error("    node -v");
    console.error("");

    let stepNumber = 2;

    if (needsCorepackInstall) {
        console.error(`${stepNumber}. 安装 Corepack：`);
        console.error("    npm install -g corepack");
        console.error("");
        stepNumber += 1;
    }

    console.error(`${stepNumber}. 启用 Corepack 代理：`);
    console.error("    corepack enable");
    console.error("");
    stepNumber += 1;
    console.error(`${stepNumber}. 安装并激活项目指定的 pnpm 版本：`);
    console.error(`    corepack install --global ${packageManager}`);
    console.error("");
    stepNumber += 1;
    console.error(`${stepNumber}. 重新运行：`);
    console.error("    pnpm install");
    console.error("");
    console.error("项目配置的包管理器版本：");
    console.error(`    ${packageManager}`);
    console.error("");
    console.error("Corepack 会下载并验证此版本，确保团队一致性。");
    console.error("");

    process.exit(1);
}

const expectedVersionMatch = packageManager.match(/pnpm@(\d+\.\d+\.\d+)/);
if (expectedVersionMatch) {
    const expectedVersion = expectedVersionMatch[1];
    const currentVersionMatch = userAgent.match(/pnpm\/(\d+\.\d+\.\d+)/);

    if (currentVersionMatch) {
        const currentVersion = currentVersionMatch[1];

        if (currentVersion !== expectedVersion) {
            console.error("");
            console.error("ERROR: pnpm 版本不匹配。");
            console.error("");
            console.error(`期望版本: ${expectedVersion}`);
            console.error(`当前版本: ${currentVersion}`);
            console.error("");
            console.error("请运行以下命令更新 pnpm 版本：");
            console.error(`    corepack use pnpm@${expectedVersion}`);
            console.error("");
            console.error("或让 Corepack 自动安装正确版本：");
            console.error("    pnpm install");
            console.error("");

            process.exit(1);
        }
    }
}

console.log("");
console.log("✓ 使用 Corepack 管理的 pnpm 版本");
console.log(`✓ 版本匹配: ${packageManager}`);
console.log("");

process.exit(0);
