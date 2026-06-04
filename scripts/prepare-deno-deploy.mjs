import { build } from "esbuild";
import { builtinModules } from "node:module";
import { chmod, cp, glob, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { SourceMapConsumer, SourceMapGenerator } from "source-map-js";
import { serverServeSource } from "./deno-serve-template.mjs";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist/deno");
const runtimeScriptDir = path.join(rootDir, "scripts/runtime");
const distScriptDir = path.join(distDir, "scripts");
const serverDir = path.join(distDir, "server");
const bundleDir = path.join(distDir, ".server-bundle-next");
const workerDir = path.join(distDir, "queues");
const entryPath = path.join(serverDir, "entry.mjs");
const serverServePath = path.join(serverDir, "serve.mjs");
const denoWebSocketPlatformEntryPath = path.join(
    rootDir,
    "../../packages/astro-full-stack-starter/src/websocket/platforms/deno/index.ts"
);
const denoWebSocketPlatformPath = path.join(serverDir, "deno-websocket.mjs");
const workerEntryPath = path.join(rootDir, "scripts/start-queue-worker.mjs");
const schedulerEntryPath = path.join(rootDir, "scripts/start-queue-scheduler.mjs");
const queueConfigSourcePath = path.join(rootDir, "src/queues/config.json");
const distPm2ConfigPath = path.join(workerDir, "queue.pm2.config.cjs");
const distWebStartScriptPath = path.join(distScriptDir, "start-web.sh");
const distQueueStartScriptPath = path.join(distScriptDir, "start-queue.sh");
const distQueueDaemonStartScriptPath = path.join(distScriptDir, "start-queue-daemon.sh");
const distQueueStopScriptPath = path.join(distScriptDir, "stop-queue.sh");
const distPreUpdateScriptPath = path.join(distScriptDir, "pre-update.sh");
const distPostUpdateScriptPath = path.join(distScriptDir, "post-update.sh");
const legacyDistScriptPaths = [
    path.join(distDir, "start-web.sh"),
    path.join(distDir, "start-queue.sh"),
    path.join(distDir, "start-queue-daemon.sh"),
    path.join(distDir, "stop-queue.sh"),
    path.join(distDir, "pre-update.sh"),
    path.join(distDir, "post-update.sh"),
];
const legacyDistPm2ConfigPaths = [
    path.join(distDir, "ecosystem.config.cjs"),
    path.join(distDir, "pm2.web.config.cjs"),
];
const nodeBuiltinSpecifiers = new Set(
    builtinModules.flatMap((moduleName) => {
        const normalizedModuleName = moduleName.replace(/^node:/, "");

        return [normalizedModuleName, `node:${normalizedModuleName}`];
    })
);

const nodeBuiltinAliasPlugin = {
    name: "node-builtin-alias",
    setup(buildContext) {
        buildContext.onResolve({ filter: /.*/ }, (args) => {
            if (!nodeBuiltinSpecifiers.has(args.path)) {
                return;
            }

            const normalizedPath = args.path.replace(/^node:/, "");

            return {
                path: `node:${normalizedPath}`,
                external: true,
            };
        });
    },
};

const denoNodeRuntimeBanner =
    'import { createRequire as __createRequire } from "node:module"; import { Buffer as __Buffer } from "node:buffer"; const require = __createRequire(import.meta.url); globalThis.Buffer ??= __Buffer;';
const denoProcessShimSource =
    'globalThis.process={...globalThis.process,argv:globalThis.process?.argv??[],env:Deno.env.toObject(),version:globalThis.process?.version??"v24.2.0",versions:globalThis.process?.versions??{node:"24.2.0"}};';

function replaceOrThrow(source, pattern, replacement, description) {
    if (!pattern.test(source)) {
        throw new Error(`Could not update ${description}.`);
    }

    return source.replace(pattern, replacement);
}

function toPosixPath(value) {
    return value.replaceAll("\\", "/");
}

function toRuntimeDirectoryUrl(fromDir, targetDir) {
    const relativePath = toPosixPath(path.relative(fromDir, targetDir));

    if (!relativePath) {
        return 'new URL("./",import.meta.url).href';
    }

    const withTrailingSlash = relativePath.endsWith("/") ? relativePath : `${relativePath}/`;
    return `new URL("${withTrailingSlash}",import.meta.url).href`;
}

async function ensureBuildOutput() {
    try {
        await stat(entryPath);
    } catch {
        throw new Error("Could not find dist/deno/server/entry.mjs. Run `astro build` first.");
    }
}

async function getDirectorySize(targetDir) {
    let total = 0;
    const files = await listFiles(targetDir);

    for (const entryPath of files) {
        const entryStat = await stat(entryPath);
        total += entryStat.size;
    }

    return total;
}

function formatBytes(value) {
    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(2)} KiB`;
    }

    return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

async function listFiles(targetDir, pattern = "**/*") {
    const files = [];

    for await (const relativePath of glob(pattern, { cwd: targetDir })) {
        files.push(path.join(targetDir, relativePath));
    }

    return files;
}

async function fileExists(targetPath) {
    try {
        await stat(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function appendSourceMapReferences(targetDir) {
    const moduleFiles = await listFiles(targetDir, "**/*.mjs");

    for (const modulePath of moduleFiles) {
        const sourceMapPath = `${modulePath}.map`;

        if (!(await fileExists(sourceMapPath))) {
            continue;
        }

        const sourceMapReference = `//# sourceMappingURL=${path.basename(sourceMapPath)}`;
        const source = await readFile(modulePath, "utf8");

        if (source.includes("sourceMappingURL=")) {
            continue;
        }

        await writeFile(modulePath, `${source.trimEnd()}\n${sourceMapReference}\n`);
    }
}

function resolveSourceMapSource(sourceMapPath, source, sourceRoot = "") {
    const absoluteSourcePath = path.resolve(path.dirname(sourceMapPath), sourceRoot, source);
    const relativeToRoot = toPosixPath(path.relative(rootDir, absoluteSourcePath));

    if (!relativeToRoot.startsWith("../")) {
        return relativeToRoot;
    }

    return toPosixPath(
        path.relative(path.dirname(path.join(bundleDir, "entry.mjs.map")), absoluteSourcePath)
    );
}

function findBundledTopLevelModuleLineIndexes(source) {
    const moduleCommentPattern =
        /^\/\/ ((?:dist\/deno\/server\/|(?:\.\.\/\.\.\/)?node_modules\/).+\.mjs)$/gm;
    const indexes = [];

    for (const match of source.matchAll(moduleCommentPattern)) {
        if (!match[1]) {
            continue;
        }

        const line = source.slice(0, match.index).split(/\r?\n/).length;

        indexes.push({
            codeLine: line + 1,
            line,
            modulePath: match[1],
        });
    }

    return indexes;
}

function resolveModuleSourcePath(modulePath) {
    return path.resolve(rootDir, modulePath);
}

function createEmbeddedModuleLineMap(entryLines, bundledModule, moduleSource) {
    const moduleLines = moduleSource.split(/\r?\n/);
    const moduleLinesByText = new Map();
    const lineMap = new Map();

    for (const [index, line] of moduleLines.entries()) {
        const text = line.trim();

        if (!text) {
            continue;
        }

        moduleLinesByText.set(text, [...(moduleLinesByText.get(text) ?? []), index + 1]);
    }

    for (let line = bundledModule.codeLine; line < bundledModule.endLine; line += 1) {
        const entryLine = entryLines[line - 1]?.trim();

        if (!entryLine) {
            continue;
        }

        const moduleLineCandidates = moduleLinesByText.get(entryLine);

        if (moduleLineCandidates?.length === 1) {
            lineMap.set(line, moduleLineCandidates[0]);
        }
    }

    return lineMap;
}

function findMappingModule(moduleIndexes, line) {
    let candidate;

    for (const moduleIndex of moduleIndexes) {
        if (moduleIndex.line <= line) {
            candidate = moduleIndex;
            continue;
        }

        break;
    }

    if (!candidate || candidate.endLine < line) {
        return undefined;
    }

    return candidate;
}

async function composeServerBundleSourceMap() {
    const bundledEntryPath = path.join(bundleDir, "entry.mjs");
    const bundledSourceMapPath = `${bundledEntryPath}.map`;
    const bundledSourceMap = JSON.parse(await readFile(bundledSourceMapPath, "utf8"));
    const bundledEntrySource = bundledSourceMap.sourcesContent?.[0];

    if (!bundledEntrySource) {
        throw new Error("Could not find bundled entry source content for sourcemap compose.");
    }

    const generator = new SourceMapGenerator({ file: "entry.mjs" });
    const sourceContentBySource = new Map();
    const bundledEntryLines = bundledEntrySource.split(/\r?\n/);
    const bundledModules = findBundledTopLevelModuleLineIndexes(bundledEntrySource).sort(
        (left, right) => left.line - right.line
    );

    for (const [index, bundledModule] of bundledModules.entries()) {
        bundledModule.endLine = bundledModules[index + 1]?.line ?? Number.POSITIVE_INFINITY;
    }

    const consumerByModulePath = new Map();

    for (const bundledModule of bundledModules) {
        const moduleSourcePath = resolveModuleSourcePath(bundledModule.modulePath);
        const moduleSourceMapPath = `${moduleSourcePath}.map`;

        if (
            consumerByModulePath.has(bundledModule.modulePath) ||
            !(await fileExists(moduleSourceMapPath))
        ) {
            continue;
        }

        const rawSourceMap = JSON.parse(await readFile(moduleSourceMapPath, "utf8"));
        const moduleSource = await readFile(moduleSourcePath, "utf8");
        consumerByModulePath.set(bundledModule.modulePath, {
            consumer: new SourceMapConsumer(rawSourceMap),
            lineMap: createEmbeddedModuleLineMap(bundledEntryLines, bundledModule, moduleSource),
            rawSourceMap,
            sourceMapPath: moduleSourceMapPath,
        });
    }

    const bundledConsumer = new SourceMapConsumer(bundledSourceMap);

    bundledConsumer.eachMapping((mapping) => {
        if (!mapping.source || mapping.originalLine === null || mapping.originalColumn === null) {
            return;
        }

        const bundledModule = findMappingModule(bundledModules, mapping.originalLine);
        if (!bundledModule) {
            return;
        }

        const moduleEntry = consumerByModulePath.get(bundledModule.modulePath);
        if (!moduleEntry) {
            return;
        }

        const moduleLine = moduleEntry.lineMap.get(mapping.originalLine);
        if (!moduleLine) {
            return;
        }

        const modulePosition = moduleEntry.consumer.originalPositionFor({
            column: mapping.originalColumn,
            line: moduleLine,
        });

        if (
            !modulePosition.source ||
            modulePosition.line === null ||
            modulePosition.column === null
        ) {
            return;
        }

        const normalizedSource = resolveSourceMapSource(
            moduleEntry.sourceMapPath,
            modulePosition.source,
            moduleEntry.rawSourceMap.sourceRoot
        );

        generator.addMapping({
            generated: {
                column: mapping.generatedColumn,
                line: mapping.generatedLine,
            },
            original: {
                column: modulePosition.column,
                line: modulePosition.line,
            },
            source: normalizedSource,
        });

        if (!sourceContentBySource.has(normalizedSource)) {
            const sourceContent = moduleEntry.consumer.sourceContentFor(
                modulePosition.source,
                true
            );

            if (sourceContent !== null) {
                sourceContentBySource.set(normalizedSource, sourceContent);
            }
        }
    });

    for (const [sourcePath, sourceContent] of sourceContentBySource) {
        generator.setSourceContent(sourcePath, sourceContent);
    }

    await writeFile(bundledSourceMapPath, `${generator.toString()}\n`);
}

async function bundleServer() {
    await rm(bundleDir, { recursive: true, force: true });
    await mkdir(bundleDir, { recursive: true });

    await build({
        entryPoints: [entryPath],
        outdir: bundleDir,
        outbase: serverDir,
        entryNames: "[name]",
        chunkNames: "chunks/[name]-[hash]",
        assetNames: "assets/[name]-[hash]",
        outExtension: {
            ".js": ".mjs",
        },
        banner: {
            js: denoNodeRuntimeBanner,
        },
        bundle: true,
        splitting: false,
        format: "esm",
        platform: "node",
        mainFields: ["module", "main"],
        conditions: ["module", "import", "default"],
        target: "node20",
        treeShaking: true,
        minify: false,
        sourcemap: "external",
        sourcesContent: true,
        legalComments: "none",
        define: {
            "process.env.NODE_ENV": '"production"',
        },
        external: ["jsr:*"],
        plugins: [nodeBuiltinAliasPlugin],
    });
}

async function bundleWorker() {
    await rm(workerDir, { recursive: true, force: true });
    await mkdir(workerDir, { recursive: true });

    await build({
        entryPoints: [workerEntryPath],
        outdir: workerDir,
        entryNames: "worker",
        chunkNames: "chunks/[name]-[hash]",
        outExtension: {
            ".js": ".mjs",
        },
        banner: {
            js: denoNodeRuntimeBanner,
        },
        bundle: true,
        splitting: true,
        format: "esm",
        platform: "node",
        mainFields: ["module", "main"],
        conditions: ["module", "import", "default"],
        target: "node20",
        treeShaking: true,
        minify: false,
        sourcemap: "external",
        sourcesContent: true,
        legalComments: "none",
        define: {
            "process.env.NODE_ENV": '"production"',
        },
        plugins: [nodeBuiltinAliasPlugin],
    });
}

async function bundleScheduler() {
    await build({
        entryPoints: [schedulerEntryPath],
        outdir: workerDir,
        entryNames: "scheduler",
        chunkNames: "chunks/[name]-[hash]",
        outExtension: {
            ".js": ".mjs",
        },
        banner: {
            js: denoNodeRuntimeBanner,
        },
        bundle: true,
        splitting: true,
        format: "esm",
        platform: "node",
        mainFields: ["module", "main"],
        conditions: ["module", "import", "default"],
        target: "node20",
        treeShaking: true,
        minify: false,
        sourcemap: "external",
        sourcesContent: true,
        legalComments: "none",
        define: {
            "process.env.NODE_ENV": '"production"',
        },
        plugins: [nodeBuiltinAliasPlugin],
    });
}

async function bundleDenoWebSocketPlatform() {
    await build({
        entryPoints: [denoWebSocketPlatformEntryPath],
        outfile: denoWebSocketPlatformPath,
        outExtension: {
            ".js": ".mjs",
        },
        bundle: true,
        splitting: false,
        format: "esm",
        platform: "node",
        mainFields: ["module", "main"],
        conditions: ["module", "import", "default"],
        target: "node20",
        treeShaking: true,
        minify: false,
        sourcemap: "external",
        sourcesContent: true,
        legalComments: "none",
        external: ["jsr:*"],
        plugins: [nodeBuiltinAliasPlugin],
    });
}

async function copyQueueConfigToDist() {
    await cp(queueConfigSourcePath, path.join(workerDir, "config.json"));
}

async function writeDistPm2Config() {
    const source = `/**
 * PM2 配置文件（Deno 构建产物）
 * 适用于 dist/deno 独立部署目录，不依赖项目 node_modules。
 */

const fs = require("fs");
const path = require("path");

const queueDir = __dirname;
const distRoot = path.resolve(queueDir, "..");
const queueConfig = JSON.parse(
    fs.readFileSync(path.resolve(queueDir, "config.json"), "utf-8")
);
const pm2BaseConfig = queueConfig.pm2;
const schedulerConfig = queueConfig.scheduler;
const denoInterpreter = process.env.DENO_BIN || "deno";
const workerScript = path.resolve(queueDir, "worker.mjs");
const schedulerScript = path.resolve(queueDir, "scheduler.mjs");

function findEnvPath() {
    const candidates = [
        path.resolve(distRoot, ".env"),
        path.resolve(process.cwd(), ".env"),
        path.resolve(distRoot, "../.env"),
        path.resolve(distRoot, "../../.env"),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function parseEnvFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return {};
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const envVars = {};

    for (const line of content.split("\\n")) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith("#")) {
            continue;
        }

        const equalIndex = trimmedLine.indexOf("=");
        if (equalIndex === -1) {
            continue;
        }

        const key = trimmedLine.slice(0, equalIndex).trim();
        let value = trimmedLine.slice(equalIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        envVars[key] = value;
    }

    return envVars;
}

const envFileVars = parseEnvFile(findEnvPath());
const denoLockPath = path.resolve(distRoot, "../../deno.lock");

function isTruthy(value) {
    return ["1", "true", "TRUE", "yes", "YES", "on", "ON"].includes(value);
}

const denoCacheRequired =
    isTruthy(process.env.DENO_CACHE_REQUIRED) || isTruthy(envFileVars.DENO_CACHE_REQUIRED);
const denoRunArgs = [
    "run",
    ...(denoCacheRequired ? ["--cached-only"] : []),
    ...(denoCacheRequired && fs.existsSync(denoLockPath)
        ? ["--lock=" + denoLockPath, "--frozen"]
        : []),
    "--no-npm",
    "--node-modules-dir=none",
    "--allow-net",
    "--allow-read",
    "--allow-env",
].join(" ");

function createPm2AppConfig(queueName, queueConfig) {
    return {
        name: \`queue-\${queueName}\`,
        cwd: distRoot,
        script: workerScript,
        args: \`--queues=\${queueName}\`,
        interpreter: denoInterpreter,
        interpreter_args: denoRunArgs,
        instances: queueConfig.instances,
        exec_mode: pm2BaseConfig.exec_mode,
        autorestart: pm2BaseConfig.autorestart,
        watch: pm2BaseConfig.watch,
        max_memory_restart: queueConfig.maxMemory,
        env: {
            ...envFileVars,
            NODE_ENV: "production",
            pm2_instance_name: \`queue-\${queueName}\`,
        },
        env_production: {
            ...envFileVars,
            NODE_ENV: "production",
            pm2_instance_name: \`queue-\${queueName}\`,
        },
        env_development: {
            ...envFileVars,
            NODE_ENV: "development",
            pm2_instance_name: \`queue-\${queueName}\`,
        },
        log_date_format: pm2BaseConfig.log_date_format,
        merge_logs: pm2BaseConfig.merge_logs,
        restart_delay: pm2BaseConfig.restart_delay,
        max_restarts: pm2BaseConfig.max_restarts,
        min_uptime: pm2BaseConfig.min_uptime,
        instance_var: pm2BaseConfig.instance_var,
    };
}

const apps = Object.entries(queueConfig.queues).map(([queueName, config]) =>
    createPm2AppConfig(queueName, config)
);

apps.push({
    name: "queue-scheduler",
    cwd: distRoot,
    script: schedulerScript,
    interpreter: denoInterpreter,
    interpreter_args: denoRunArgs,
    instances: 1,
    exec_mode: "fork",
    autorestart: pm2BaseConfig.autorestart,
    watch: false,
    max_memory_restart: schedulerConfig.maxMemory,
    env: {
        ...envFileVars,
        NODE_ENV: "production",
        pm2_instance_name: "queue-scheduler",
    },
    env_production: {
        ...envFileVars,
        NODE_ENV: "production",
        pm2_instance_name: "queue-scheduler",
    },
    env_development: {
        ...envFileVars,
        NODE_ENV: "development",
        pm2_instance_name: "queue-scheduler",
    },
    log_date_format: pm2BaseConfig.log_date_format,
    merge_logs: pm2BaseConfig.merge_logs,
    restart_delay: pm2BaseConfig.restart_delay,
    max_restarts: pm2BaseConfig.max_restarts,
    min_uptime: pm2BaseConfig.min_uptime,
    instance_var: pm2BaseConfig.instance_var,
});

const includeQueueAll =
    process.env.PM2_INCLUDE_QUEUE_ALL === "true" || envFileVars.PM2_INCLUDE_QUEUE_ALL === "true";

if (includeQueueAll) {
    apps.push({
        name: "queue-all",
        cwd: distRoot,
        script: workerScript,
        interpreter: denoInterpreter,
        interpreter_args: denoRunArgs,
        instances: 1,
        exec_mode: pm2BaseConfig.exec_mode,
        autorestart: pm2BaseConfig.autorestart,
        watch: pm2BaseConfig.watch,
        max_memory_restart: "500M",
        env: {
            ...envFileVars,
            NODE_ENV: "production",
            pm2_instance_name: "queue-all",
        },
        env_production: {
            ...envFileVars,
            NODE_ENV: "production",
            pm2_instance_name: "queue-all",
        },
        env_development: {
            ...envFileVars,
            NODE_ENV: "development",
            pm2_instance_name: "queue-all",
        },
        log_date_format: pm2BaseConfig.log_date_format,
        merge_logs: pm2BaseConfig.merge_logs,
        restart_delay: pm2BaseConfig.restart_delay,
        max_restarts: pm2BaseConfig.max_restarts,
        min_uptime: pm2BaseConfig.min_uptime,
        instance_var: pm2BaseConfig.instance_var,
    });
}

module.exports = {
    apps,
};
`;

    await writeFile(distPm2ConfigPath, source);
}

async function writeDistStartScripts() {
    const scriptsToCopy = [
        ["start-web.sh", distWebStartScriptPath],
        ["start-queue.sh", distQueueStartScriptPath],
        ["start-queue-daemon.sh", distQueueDaemonStartScriptPath],
        ["stop-queue.sh", distQueueStopScriptPath],
        ["pre-update.sh", distPreUpdateScriptPath],
        ["post-update.sh", distPostUpdateScriptPath],
    ];

    await mkdir(distScriptDir, { recursive: true });

    for (const [fileName, targetPath] of scriptsToCopy) {
        await cp(path.join(runtimeScriptDir, fileName), targetPath);
        await chmod(targetPath, 0o755);
    }
}

async function patchBundledManifest() {
    const moduleFiles = await listFiles(bundleDir, "**/*.mjs");

    let patched = false;

    for (const modulePath of moduleFiles) {
        let source = await readFile(modulePath, "utf8");

        if (!/(?:^|[,{]\s*)(?:"buildClientDir"|buildClientDir)\s*:\s*"file:/.test(source)) {
            continue;
        }

        // Compute runtime paths against the module's final location under dist/deno/server,
        // not the temporary bundle directory. Otherwise the copied output points one
        // level too far up when moved from .server-bundle to server.
        const finalModulePath = modulePath.replace(bundleDir, serverDir);
        const finalModuleDir = path.dirname(finalModulePath);
        const outDirExpr = toRuntimeDirectoryUrl(finalModuleDir, distDir);
        const buildClientDirExpr = toRuntimeDirectoryUrl(
            finalModuleDir,
            path.join(distDir, "client")
        );
        const buildServerDirExpr = toRuntimeDirectoryUrl(finalModuleDir, serverDir);

        source = replaceOrThrow(
            source,
            /((?:^|[,{]\s*)(?:"outDir"|outDir)\s*:\s*)"file:[^"]+"/g,
            `$1${outDirExpr}`,
            "bundled manifest outDir"
        );
        source = replaceOrThrow(
            source,
            /((?:^|[,{]\s*)(?:"buildClientDir"|buildClientDir)\s*:\s*)"file:[^"]+"/g,
            `$1${buildClientDirExpr}`,
            "bundled manifest buildClientDir"
        );
        source = replaceOrThrow(
            source,
            /((?:^|[,{]\s*)(?:"buildServerDir"|buildServerDir)\s*:\s*)"file:[^"]+"/g,
            `$1${buildServerDirExpr}`,
            "bundled manifest buildServerDir"
        );

        await writeFile(modulePath, source);
        patched = true;
        break;
    }

    if (!patched) {
        throw new Error("Could not find bundled manifest payload.");
    }
}

async function patchRelativeClientPath() {
    const moduleFiles = await listFiles(bundleDir, "**/*.mjs");

    let patched = false;

    for (const modulePath of moduleFiles) {
        let source = await readFile(modulePath, "utf8");

        if (!source.includes("relativeClientPath")) {
            continue;
        }

        const finalModulePath = modulePath.replace(bundleDir, serverDir);
        const finalModuleDir = path.dirname(finalModulePath);
        const relativeClientPath = toPosixPath(
            path.relative(finalModuleDir, path.join(distDir, "client"))
        );
        const normalizedRelativeClientPath = relativeClientPath.endsWith("/")
            ? relativeClientPath
            : `${relativeClientPath}/`;
        source = replaceOrThrow(
            source,
            /((?:^|[,{]\s*)(?:"relativeClientPath"|relativeClientPath)\s*:\s*|(?:^|[;\n]\s*)relativeClientPath\s*=\s*)"[^"]+"/g,
            (_match, prefix) => `${prefix}"${normalizedRelativeClientPath}"`,
            "bundled relativeClientPath"
        );

        await writeFile(modulePath, source);
        patched = true;
        break;
    }

    if (!patched) {
        console.log("[prepare-deno-deploy] skipped relativeClientPath patch.");
    }
}

async function patchServerHandleRenderOptions() {
    const moduleFiles = await listFiles(bundleDir, "**/*.mjs");

    let patched = false;

    for (const modulePath of moduleFiles) {
        let source = await readFile(modulePath, "utf8");
        const nextSource = source
            .replace(
                /async handle\((\w+)\)\{return (\w+)\.render\(\1\)\}/,
                "async handle($1,renderOptions){return $2.render($1,renderOptions)}"
            )
            .replace(
                /async handle\((\w+)\) \{\s+return (\w+)\.render\(\1\);\s+\}/,
                "async handle($1, renderOptions) {\n      return $2.render($1, renderOptions);\n    }"
            )
            .replace(
                /function handle\((\w+)\) \{\s+return (\w+)\.render\(\1\);\s+\}/,
                "function handle($1, renderOptions) {\n  return $2.render($1, renderOptions);\n}"
            );

        if (nextSource === source) {
            continue;
        }

        source = nextSource;
        await writeFile(modulePath, source);
        patched = true;
        break;
    }

    if (!patched) {
        throw new Error("Could not patch bundled server handle render options.");
    }
}

async function patchDenoProcessShim() {
    const moduleFiles = await listFiles(bundleDir, "**/*.mjs");

    let patched = false;

    for (const modulePath of moduleFiles) {
        let source = await readFile(modulePath, "utf8");

        const compactDenoProcessShim = "globalThis.process={argv:[],env:Deno.env.toObject()};";
        const formattedDenoProcessShim =
            /globalThis\.process = \{\s*argv: \[\],\s*env: Deno\.env\.toObject\(\)\s*\};/;

        if (source.includes(denoProcessShimSource)) {
            patched = true;
            break;
        }

        if (source.includes(compactDenoProcessShim) || formattedDenoProcessShim.test(source)) {
            source = source
                .replace(compactDenoProcessShim, denoProcessShimSource)
                .replace(formattedDenoProcessShim, denoProcessShimSource);
        } else if (source.startsWith(denoNodeRuntimeBanner)) {
            source = source.replace(
                denoNodeRuntimeBanner,
                `${denoNodeRuntimeBanner} ${denoProcessShimSource}`
            );
        } else {
            continue;
        }

        await writeFile(modulePath, source);
        patched = true;
        break;
    }

    if (!patched) {
        throw new Error("Could not patch Deno process shim.");
    }
}

async function replaceServerOutput() {
    await rm(serverDir, { recursive: true, force: true });
    await mkdir(serverDir, { recursive: true });
    await cp(bundleDir, serverDir, { recursive: true });
    await rm(bundleDir, { recursive: true, force: true });
}

async function writeServerServeEntry() {
    await writeFile(serverServePath, serverServeSource);
}

await ensureBuildOutput();

const originalSize = await getDirectorySize(serverDir);

await appendSourceMapReferences(serverDir);
await bundleServer();
await patchBundledManifest();
await patchRelativeClientPath();
await patchServerHandleRenderOptions();
await patchDenoProcessShim();
await composeServerBundleSourceMap();
await appendSourceMapReferences(bundleDir);
await bundleWorker();
await bundleScheduler();
await appendSourceMapReferences(workerDir);
await copyQueueConfigToDist();
await writeDistPm2Config();
for (const legacyDistPm2ConfigPath of legacyDistPm2ConfigPaths) {
    await rm(legacyDistPm2ConfigPath, { force: true });
}
for (const legacyDistScriptPath of legacyDistScriptPaths) {
    await rm(legacyDistScriptPath, { force: true });
}
await writeDistStartScripts();

const bundledSize = await getDirectorySize(bundleDir);
const workerSize = await getDirectorySize(workerDir);

await replaceServerOutput();
await bundleDenoWebSocketPlatform();
await appendSourceMapReferences(serverDir);
await writeServerServeEntry();

const increasedBytes = bundledSize - originalSize;
const increasedPercent = originalSize === 0 ? 0 : (increasedBytes / originalSize) * 100;

console.log();
console.log(
    `[prepare-deno-deploy] server size: ${formatBytes(originalSize)} -> ${formatBytes(bundledSize)}`
);
console.log(
    `[prepare-deno-deploy] increased: ${formatBytes(increasedBytes)} (${increasedPercent.toFixed(2)}%)`
);
console.log(`[prepare-deno-deploy] worker bundle size: ${formatBytes(workerSize)}`);
