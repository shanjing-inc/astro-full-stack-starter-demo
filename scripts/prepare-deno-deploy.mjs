import { build } from "esbuild";
import { existsSync } from "node:fs";
import { builtinModules } from "node:module";
import { chmod, cp, glob, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SourceMapConsumer, SourceMapGenerator } from "source-map-js";
import { serverServeSource } from "./deno-serve-template.mjs";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist/deno");
const sentrySourceMapsDir = path.join(rootDir, "dist/sentry-sourcemaps");
const runtimeScriptDir = path.join(rootDir, "scripts/runtime");
const distScriptDir = path.join(distDir, "scripts");
const serverDir = path.join(distDir, "server");
const bundleDir = path.join(distDir, ".server-bundle-next");
const workerDir = path.join(distDir, "queues");
const entryPath = path.join(serverDir, "entry.mjs");
const serverServePath = path.join(serverDir, "serve.mjs");
const workspaceRootDir = path.resolve(rootDir, "../..");
const packageSourceDir = path.join(workspaceRootDir, "packages/astro-full-stack-starter/src");
const workspaceDenoWebSocketPlatformEntryPath = path.join(
    packageSourceDir,
    "websocket/platforms/deno/index.ts"
);
const denoWebSocketPlatformEntryPath = existsSync(workspaceDenoWebSocketPlatformEntryPath)
    ? workspaceDenoWebSocketPlatformEntryPath
    : fileURLToPath(
          import.meta.resolve("@shanjing/astro-full-stack-starter/websocket/platforms/deno")
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
const validBuildProfiles = new Set(["release", "debug"]);

function readBuildProfile() {
    const profileArg = process.argv.find((arg) => arg.startsWith("--profile="));
    const rawProfile =
        profileArg?.slice("--profile=".length) ||
        process.env.DENO_DEPLOY_BUILD_PROFILE ||
        process.env.DENO_BUILD_PROFILE ||
        "release";
    const profile = rawProfile.trim();

    if (!validBuildProfiles.has(profile)) {
        throw new Error(
            `Invalid Deno deploy build profile: ${profile}. Expected release or debug.`
        );
    }

    return profile;
}

const buildProfile = readBuildProfile();
const isDebugBuild = buildProfile === "debug";
const isReleaseBuild = buildProfile === "release";
const shouldGenerateSourceMaps = isDebugBuild || isReleaseBuild;
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

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createSameLengthReplacement(matchValue, replacementValue) {
    if (replacementValue.length > matchValue.length) {
        throw new Error(`Replacement is longer than matched value: ${replacementValue}`);
    }

    if (matchValue.endsWith("/") && replacementValue.endsWith("/")) {
        return `${replacementValue.slice(0, -1)}${"_".repeat(
            matchValue.length - replacementValue.length
        )}/`;
    }

    return `${replacementValue}${"_".repeat(matchValue.length - replacementValue.length)}`;
}

function addSameLengthScrubRule(rules, pattern, replacementValue) {
    if (pattern instanceof RegExp) {
        rules.push([
            pattern,
            (matchValue) => createSameLengthReplacement(matchValue, replacementValue),
        ]);
        return;
    }

    rules.push([
        new RegExp(escapeRegExp(pattern), "g"),
        createSameLengthReplacement(pattern, replacementValue),
    ]);
}

function withSourceMapReference(source, sourceMapFileName) {
    const withoutSourceMapReference = source.replace(
        /\r?\n?\/\/# sourceMappingURL=.*(?:\r?\n)?$/,
        ""
    );

    return `${withoutSourceMapReference.trimEnd()}\n//# sourceMappingURL=${sourceMapFileName}\n`;
}

function stripSourceMapReference(source) {
    return source.replace(/\r?\n?\/\/# sourceMappingURL=.*(?:\r?\n)?$/, "");
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
    const absValue = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    let formatted;

    if (absValue < 1024) {
        formatted = `${absValue} B`;
    } else if (absValue < 1024 * 1024) {
        formatted = `${(absValue / 1024).toFixed(2)} KiB`;
    } else {
        formatted = `${(absValue / (1024 * 1024)).toFixed(2)} MiB`;
    }

    return `${sign}${formatted}`;
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

function createBundleOptions(overrides = {}) {
    return {
        bundle: true,
        conditions: ["module", "import", "default"],
        format: "esm",
        legalComments: "none",
        mainFields: ["module", "main"],
        minify: false,
        platform: "node",
        sourcemap: shouldGenerateSourceMaps ? "external" : false,
        sourcesContent: shouldGenerateSourceMaps,
        target: "node20",
        treeShaking: true,
        ...overrides,
        outExtension: {
            ".js": ".mjs",
            ...(overrides.outExtension ?? {}),
        },
        plugins: overrides.plugins ?? [nodeBuiltinAliasPlugin],
    };
}

async function deleteSourceMaps(targetDir) {
    const sourceMapFiles = await listFiles(targetDir, "**/*.map");

    for (const sourceMapFile of sourceMapFiles) {
        await rm(sourceMapFile, { force: true });
    }
}

function createSourcePathScrubRules() {
    const demoSourceDir = toPosixPath(path.join(rootDir, "src"));
    const packageSourcePath = toPosixPath(packageSourceDir);
    const workspaceRootPath = toPosixPath(workspaceRootDir);
    const demoSourcePrefix = `${demoSourceDir}/`;
    const packageSourcePrefix = `${packageSourcePath}/`;
    const rules = [];

    addSameLengthScrubRule(rules, demoSourcePrefix, "/d/");
    addSameLengthScrubRule(rules, packageSourcePrefix, "/p/");

    if (workspaceRootPath !== "/" && workspaceRootPath.length > 1) {
        addSameLengthScrubRule(rules, workspaceRootPath, "/w/");
    }

    addSameLengthScrubRule(rules, /\bsrc\/pages\//g, "app/pages/");
    rules.push([
        /\bsrc\/[^"'\s]+\.tsx?\b/g,
        (matchValue) => {
            return matchValue
                .replace(/^src\//, "app/")
                .replace(/\.tsx\b/, ".jsx")
                .replace(/\.ts\b/, ".js");
        },
    ]);
    addSameLengthScrubRule(rules, /\.astro\b/g, ".route");

    return rules;
}

async function scrubReleaseSourcePaths() {
    const textFilePattern = "**/*.{mjs,js,cjs,json,html,css,sh}";
    const files = await listFiles(distDir, textFilePattern);
    const rules = createSourcePathScrubRules();

    for (const filePath of files) {
        const source = await readFile(filePath, "utf8");
        const nextSource = rules.reduce(
            (currentSource, [pattern, replacement]) => currentSource.replace(pattern, replacement),
            source
        );

        if (nextSource !== source) {
            await writeFile(filePath, nextSource);
        }
    }
}

async function minifyModuleFiles(targetDir) {
    const moduleFiles = await listFiles(targetDir, "**/*.mjs");

    for (const modulePath of moduleFiles) {
        const minifiedPath = `${modulePath}.min`;
        const minifiedSourceMapPath = `${minifiedPath}.map`;
        const sourceMapPath = `${modulePath}.map`;
        const hasSourceMap = await fileExists(sourceMapPath);
        const source = await readFile(modulePath, "utf8");
        const inputSourceMap = hasSourceMap ? await readFile(sourceMapPath, "utf8") : undefined;
        const minifySource = hasSourceMap
            ? withSourceMapReference(source, path.basename(sourceMapPath))
            : source;

        if (hasSourceMap && !source.includes("sourceMappingURL=")) {
            await writeFile(modulePath, minifySource);
        }

        await build({
            entryPoints: [modulePath],
            outfile: minifiedPath,
            bundle: false,
            format: "esm",
            legalComments: "none",
            minify: true,
            platform: "node",
            sourcemap: hasSourceMap ? "external" : false,
            sourcesContent: hasSourceMap,
            target: "node20",
        });
        await rename(minifiedPath, modulePath);

        if (await fileExists(minifiedSourceMapPath)) {
            await rename(minifiedSourceMapPath, sourceMapPath);
            await composeMinifiedSourceMap(sourceMapPath, inputSourceMap);

            const minifiedSource = await readFile(modulePath, "utf8");
            const nextMinifiedSource = minifiedSource.replace(
                /^\/\/# sourceMappingURL=.*$/m,
                `//# sourceMappingURL=${path.basename(sourceMapPath)}`
            );

            if (nextMinifiedSource !== minifiedSource) {
                await writeFile(modulePath, nextMinifiedSource);
            }
        }
    }
}

async function composeMinifiedSourceMap(sourceMapPath, inputSourceMap) {
    if (!inputSourceMap) {
        return;
    }

    const minifiedSourceMap = JSON.parse(await readFile(sourceMapPath, "utf8"));
    const minifiedSources = minifiedSourceMap.sources ?? [];
    const hasComposedOriginalSources = minifiedSources.some((source) => {
        return (
            !source.includes("node_modules") &&
            (source.includes("src/") || source.includes(".astro"))
        );
    });

    if (hasComposedOriginalSources) {
        return;
    }

    const inputRawSourceMap = JSON.parse(inputSourceMap);
    const generator = new SourceMapGenerator({
        file: path.basename(sourceMapPath).replace(/\.map$/, ""),
    });
    const minifiedConsumer = new SourceMapConsumer(minifiedSourceMap);
    const inputConsumer = new SourceMapConsumer(inputRawSourceMap);
    const sourceContentBySource = new Map();

    minifiedConsumer.eachMapping((mapping) => {
        if (!mapping.source || mapping.originalLine === null || mapping.originalColumn === null) {
            return;
        }

        const inputPosition = inputConsumer.originalPositionFor({
            column: mapping.originalColumn,
            line: mapping.originalLine,
        });

        if (!inputPosition.source || inputPosition.line === null || inputPosition.column === null) {
            return;
        }

        generator.addMapping({
            generated: {
                column: mapping.generatedColumn,
                line: mapping.generatedLine,
            },
            name: inputPosition.name ?? mapping.name ?? undefined,
            original: {
                column: inputPosition.column,
                line: inputPosition.line,
            },
            source: inputPosition.source,
        });

        if (!sourceContentBySource.has(inputPosition.source)) {
            const sourceContent = inputConsumer.sourceContentFor(inputPosition.source, true);

            if (sourceContent !== null) {
                sourceContentBySource.set(inputPosition.source, sourceContent);
            }
        }
    });

    for (const [sourcePath, sourceContent] of sourceContentBySource) {
        generator.setSourceContent(sourcePath, sourceContent);
    }

    await writeFile(sourceMapPath, `${generator.toString()}\n`);
}

async function stageSentrySourceMaps() {
    await rm(sentrySourceMapsDir, { recursive: true, force: true });
    await mkdir(sentrySourceMapsDir, { recursive: true });

    const sourceMapFiles = await listFiles(distDir, "**/*.map");

    for (const sourceMapPath of sourceMapFiles) {
        const generatedSourcePath = sourceMapPath.replace(/\.map$/, "");
        const relativeSourceMapPath = path.relative(distDir, sourceMapPath);
        const relativeGeneratedSourcePath = path.relative(distDir, generatedSourcePath);
        const targetSourceMapPath = path.join(sentrySourceMapsDir, relativeSourceMapPath);
        const targetGeneratedSourcePath = path.join(
            sentrySourceMapsDir,
            relativeGeneratedSourcePath
        );

        await mkdir(path.dirname(targetSourceMapPath), { recursive: true });
        await cp(sourceMapPath, targetSourceMapPath);

        if (await fileExists(generatedSourcePath)) {
            const generatedSource = await readFile(generatedSourcePath, "utf8");
            const stagedGeneratedSource = withSourceMapReference(
                generatedSource,
                path.basename(sourceMapPath)
            );

            await mkdir(path.dirname(targetGeneratedSourcePath), { recursive: true });
            await writeFile(targetGeneratedSourcePath, stagedGeneratedSource);
        }
    }
}

async function assertSentrySourceMapsMatchRuntime() {
    const sourceMapFiles = await listFiles(sentrySourceMapsDir, "**/*.map");

    for (const sourceMapPath of sourceMapFiles) {
        const relativeSourceMapPath = path.relative(sentrySourceMapsDir, sourceMapPath);
        const relativeGeneratedSourcePath = relativeSourceMapPath.replace(/\.map$/, "");
        const stagedGeneratedSourcePath = path.join(
            sentrySourceMapsDir,
            relativeGeneratedSourcePath
        );
        const runtimeGeneratedSourcePath = path.join(distDir, relativeGeneratedSourcePath);

        if (!(await fileExists(stagedGeneratedSourcePath))) {
            throw new Error(`Sentry sourcemap is missing generated source: ${sourceMapPath}`);
        }

        if (!(await fileExists(runtimeGeneratedSourcePath))) {
            throw new Error(`Sentry generated source has no runtime match: ${sourceMapPath}`);
        }

        const stagedGeneratedSource = stripSourceMapReference(
            await readFile(stagedGeneratedSourcePath, "utf8")
        ).trimEnd();
        const runtimeGeneratedSource = stripSourceMapReference(
            await readFile(runtimeGeneratedSourcePath, "utf8")
        ).trimEnd();

        if (stagedGeneratedSource !== runtimeGeneratedSource) {
            throw new Error(
                `Sentry generated source does not match runtime output: ${relativeGeneratedSourcePath}`
            );
        }
    }

    const entrySourceMapPath = path.join(sentrySourceMapsDir, "server/entry.mjs.map");
    const entrySourceMap = JSON.parse(await readFile(entrySourceMapPath, "utf8"));
    const entrySources = entrySourceMap.sources ?? [];
    const originalServerSources = [
        ...new Set(
            entrySources.filter((source) => {
                return (
                    !source.includes("node_modules") &&
                    (source.includes("src/") || source.includes(".astro"))
                );
            })
        ),
    ];
    const hasAstroServerSource = originalServerSources.some((source) => source.includes(".astro"));

    if (originalServerSources.length === 0) {
        throw new Error("Sentry server sourcemap does not point to original source files.");
    }

    if (originalServerSources.length < 2 || !hasAstroServerSource) {
        throw new Error(
            "Sentry server sourcemap does not include multiple original server sources."
        );
    }
}

async function removeSourceMapReferences(targetDir) {
    const moduleFiles = await listFiles(targetDir, "**/*.mjs");

    for (const modulePath of moduleFiles) {
        const source = await readFile(modulePath, "utf8");
        const nextSource = source.replace(/^\/\/# sourceMappingURL=.*(?:\r?\n)?/gm, "");

        if (nextSource !== source) {
            await writeFile(modulePath, nextSource);
        }
    }
}

async function assertReleaseOutputHardened() {
    const sourceMapFiles = await listFiles(distDir, "**/*.map");

    if (sourceMapFiles.length > 0) {
        throw new Error(`Release output still contains source maps: ${sourceMapFiles[0]}`);
    }

    const forbiddenPatterns = [
        ["sourcesContent", /sourcesContent/],
        ["sourceMappingURL", /sourceMappingURL/],
        ["workspace absolute path", /\/home\/dream\/wwwroot/],
        ["docker source placeholder", /\/app\/source/],
        ["docker workspace placeholder", /\/app\/workspace/],
        ["demo source path", /projects\/deno-mysql-demo\/src/],
        ["package source path", /packages\/astro-full-stack-starter\/src/],
        ["Astro source path", /\.astro\b/],
        ["page source path", /\bsrc\/pages\//],
        ["TypeScript source path", /\bsrc\/[^"'\s]+\.tsx?\b/],
    ];
    const textFiles = await listFiles(distDir, "**/*.{mjs,js,cjs,json,html,css,sh}");

    for (const filePath of textFiles) {
        const source = await readFile(filePath, "utf8");

        for (const [description, pattern] of forbiddenPatterns) {
            if (pattern.test(source)) {
                throw new Error(`Release output still contains ${description}: ${filePath}`);
            }
        }
    }
}

async function hardenReleaseOutput() {
    await minifyModuleFiles(serverDir);
    await minifyModuleFiles(workerDir);
    await removeSourceMapReferences(distDir);
    await scrubReleaseSourcePaths();
    await stageSentrySourceMaps();
    await assertSentrySourceMapsMatchRuntime();
    await deleteSourceMaps(distDir);
    await assertReleaseOutputHardened();
}

async function appendSourceMapReferences(targetDir) {
    const moduleFiles = await listFiles(targetDir, "**/*.mjs");

    for (const modulePath of moduleFiles) {
        const sourceMapPath = `${modulePath}.map`;

        if (!(await fileExists(sourceMapPath))) {
            continue;
        }

        const source = await readFile(modulePath, "utf8");

        if (source.includes("sourceMappingURL=")) {
            continue;
        }

        await writeFile(modulePath, withSourceMapReference(source, path.basename(sourceMapPath)));
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
            continue;
        }

        const offsetLine = line - bundledModule.codeLine + 1;

        if (offsetLine >= 1 && offsetLine <= moduleLines.length) {
            lineMap.set(line, offsetLine);
        }
    }

    return lineMap;
}

async function composeServerBundleSourceMap() {
    const bundledEntryPath = path.join(bundleDir, "entry.mjs");
    const bundledSourceMapPath = `${bundledEntryPath}.map`;
    const bundledEntrySource = await readFile(bundledEntryPath, "utf8");

    const generator = new SourceMapGenerator({ file: "entry.mjs" });
    const sourceContentBySource = new Map();
    const bundledEntryLines = bundledEntrySource.split(/\r?\n/);
    const bundledModules = findBundledTopLevelModuleLineIndexes(bundledEntrySource).sort(
        (left, right) => left.line - right.line
    );

    for (const [index, bundledModule] of bundledModules.entries()) {
        bundledModule.endLine = bundledModules[index + 1]?.line ?? Number.POSITIVE_INFINITY;
    }

    const sourceEntryByModulePath = new Map();

    for (const bundledModule of bundledModules) {
        const moduleSourcePath = resolveModuleSourcePath(bundledModule.modulePath);
        const moduleSourceMapPath = `${moduleSourcePath}.map`;

        if (
            sourceEntryByModulePath.has(bundledModule.modulePath) ||
            !(await fileExists(moduleSourceMapPath))
        ) {
            continue;
        }

        const rawSourceMap = JSON.parse(await readFile(moduleSourceMapPath, "utf8"));
        const moduleSource = await readFile(moduleSourcePath, "utf8");
        const sources = rawSourceMap.sources ?? [];

        if (sources.length === 0) {
            continue;
        }

        for (const [sourceIndex, source] of sources.entries()) {
            const sourceContent = rawSourceMap.sourcesContent?.[sourceIndex];

            if (sourceContent === undefined) {
                continue;
            }

            sourceContentBySource.set(
                resolveSourceMapSource(moduleSourceMapPath, source, rawSourceMap.sourceRoot),
                sourceContent
            );
        }

        sourceEntryByModulePath.set(bundledModule.modulePath, {
            consumer: new SourceMapConsumer(rawSourceMap),
            lineMap: createEmbeddedModuleLineMap(bundledEntryLines, bundledModule, moduleSource),
            sourceMapPath: moduleSourceMapPath,
            sourceRoot: rawSourceMap.sourceRoot,
        });
    }

    for (const bundledModule of bundledModules) {
        const sourceEntry = sourceEntryByModulePath.get(bundledModule.modulePath);

        if (!sourceEntry) {
            continue;
        }

        for (const [generatedLine, moduleLine] of sourceEntry.lineMap) {
            const originalPosition = sourceEntry.consumer.originalPositionFor({
                bias: SourceMapConsumer.LEAST_UPPER_BOUND,
                column: 0,
                line: moduleLine,
            });

            if (
                !originalPosition.source ||
                originalPosition.line === null ||
                originalPosition.column === null
            ) {
                continue;
            }

            generator.addMapping({
                generated: {
                    column: 0,
                    line: generatedLine,
                },
                original: {
                    column: originalPosition.column,
                    line: originalPosition.line,
                },
                source: resolveSourceMapSource(
                    sourceEntry.sourceMapPath,
                    originalPosition.source,
                    sourceEntry.sourceRoot
                ),
            });
        }
    }

    for (const [sourcePath, sourceContent] of sourceContentBySource) {
        generator.setSourceContent(sourcePath, sourceContent);
    }

    await writeFile(bundledSourceMapPath, `${generator.toString()}\n`);
}

async function bundleServer() {
    await rm(bundleDir, { recursive: true, force: true });
    await mkdir(bundleDir, { recursive: true });

    await build(
        createBundleOptions({
            entryPoints: [entryPath],
            outdir: bundleDir,
            outbase: serverDir,
            entryNames: "[name]",
            chunkNames: "chunks/[name]-[hash]",
            assetNames: "assets/[name]-[hash]",
            banner: {
                js: denoNodeRuntimeBanner,
            },
            splitting: false,
            define: {
                "process.env.NODE_ENV": '"production"',
            },
            external: ["jsr:*"],
        })
    );
}

async function bundleWorker() {
    await rm(workerDir, { recursive: true, force: true });
    await mkdir(workerDir, { recursive: true });

    await build(
        createBundleOptions({
            entryPoints: [workerEntryPath],
            outdir: workerDir,
            entryNames: "worker",
            chunkNames: "chunks/[name]-[hash]",
            banner: {
                js: denoNodeRuntimeBanner,
            },
            splitting: true,
            define: {
                "process.env.NODE_ENV": '"production"',
            },
        })
    );
}

async function bundleScheduler() {
    await build(
        createBundleOptions({
            entryPoints: [schedulerEntryPath],
            outdir: workerDir,
            entryNames: "scheduler",
            chunkNames: "chunks/[name]-[hash]",
            banner: {
                js: denoNodeRuntimeBanner,
            },
            splitting: true,
            define: {
                "process.env.NODE_ENV": '"production"',
            },
        })
    );
}

async function bundleDenoWebSocketPlatform() {
    await build(
        createBundleOptions({
            entryPoints: [denoWebSocketPlatformEntryPath],
            outfile: denoWebSocketPlatformPath,
            splitting: false,
            external: ["jsr:*"],
        })
    );
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

console.log(`[prepare-deno-deploy] build profile: ${buildProfile}`);

await rm(sentrySourceMapsDir, { recursive: true, force: true });

const originalSize = await getDirectorySize(serverDir);

if (shouldGenerateSourceMaps) {
    await appendSourceMapReferences(serverDir);
}
await bundleServer();
await patchBundledManifest();
await patchRelativeClientPath();
await patchServerHandleRenderOptions();
await patchDenoProcessShim();
if (shouldGenerateSourceMaps) {
    await composeServerBundleSourceMap();
    await appendSourceMapReferences(bundleDir);
}
await bundleWorker();
await bundleScheduler();
if (shouldGenerateSourceMaps) {
    await appendSourceMapReferences(workerDir);
}
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
const originalQueueSize = await getDirectorySize(workerDir);

await replaceServerOutput();
await bundleDenoWebSocketPlatform();
if (shouldGenerateSourceMaps) {
    await appendSourceMapReferences(serverDir);
}
await writeServerServeEntry();
if (isReleaseBuild) {
    await hardenReleaseOutput();
}

const finalQueueSize = await getDirectorySize(workerDir);
const serverIncreasedBytes = bundledSize - originalSize;
const serverIncreasedPercent = originalSize === 0 ? 0 : (serverIncreasedBytes / originalSize) * 100;
const queueIncreasedBytes = finalQueueSize - originalQueueSize;
const queueIncreasedPercent =
    originalQueueSize === 0 ? 0 : (queueIncreasedBytes / originalQueueSize) * 100;

console.log();
console.log(
    `[prepare-deno-deploy] server size: ${formatBytes(originalSize)} -> ${formatBytes(bundledSize)}`
);
console.log(
    `[prepare-deno-deploy] server increased: ${formatBytes(serverIncreasedBytes)} (${serverIncreasedPercent.toFixed(2)}%)`
);
console.log(
    `[prepare-deno-deploy] queue size: ${formatBytes(originalQueueSize)} -> ${formatBytes(finalQueueSize)}`
);
console.log(
    `[prepare-deno-deploy] queue increased: ${formatBytes(queueIncreasedBytes)} (${queueIncreasedPercent.toFixed(2)}%)`
);
