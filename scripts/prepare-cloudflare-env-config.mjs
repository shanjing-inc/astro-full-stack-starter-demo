import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parse } from "jsonc-parser";

const rootDir = process.cwd();
const sourceConfigPath = path.join(rootDir, "wrangler.jsonc");
const generatedConfigPath = path.join(rootDir, "dist/server/wrangler.json");
const generatedConfigDir = path.dirname(generatedConfigPath);

function readJsonc(filePath) {
    const errors = [];
    const config = parse(readFileSync(filePath, "utf8"), errors, {
        allowTrailingComma: true,
        disallowComments: false,
    });

    if (errors.length > 0) {
        throw new Error(`Failed to parse ${filePath}: ${JSON.stringify(errors)}`);
    }

    return config;
}

const sourceConfig = readJsonc(sourceConfigPath);
const generatedConfig = JSON.parse(readFileSync(generatedConfigPath, "utf8"));

if (!sourceConfig.env || Object.keys(sourceConfig.env).length === 0) {
    throw new Error("wrangler.jsonc does not define any Cloudflare environments.");
}

function mergeByKey(baseItems = [], overrideItems = [], key) {
    const merged = new Map();

    for (const item of baseItems) {
        merged.set(item[key], item);
    }

    for (const item of overrideItems) {
        merged.set(item[key], item);
    }

    return Array.from(merged.values());
}

function buildEnvironmentConfig(environmentName, environmentConfig) {
    const environmentVars = environmentConfig.vars ?? {};
    const config = {
        ...generatedConfig,
        ...environmentConfig,
        vars: {
            ...generatedConfig.vars,
            ...environmentVars,
        },
        d1_databases: mergeByKey(
            generatedConfig.d1_databases,
            environmentConfig.d1_databases,
            "binding"
        ),
        kv_namespaces: mergeByKey(
            generatedConfig.kv_namespaces,
            environmentConfig.kv_namespaces,
            "binding"
        ),
        queues: environmentConfig.queues ?? generatedConfig.queues,
        durable_objects: {
            ...generatedConfig.durable_objects,
            ...environmentConfig.durable_objects,
            bindings: mergeByKey(
                generatedConfig.durable_objects?.bindings,
                environmentConfig.durable_objects?.bindings,
                "name"
            ),
        },
    };

    delete config.env;
    delete config.definedEnvironments;

    for (const varName of Object.keys(sourceConfig.vars ?? {})) {
        if (!Object.hasOwn(environmentVars, varName)) {
            delete config.vars?.[varName];
        }
    }

    const outputPath = path.join(generatedConfigDir, `wrangler.${environmentName}.json`);
    writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);

    return outputPath;
}

const generatedFiles = Object.entries(sourceConfig.env).map(
    ([environmentName, environmentConfig]) =>
        buildEnvironmentConfig(environmentName, environmentConfig)
);

console.log(
    `Prepared Cloudflare env config: ${generatedFiles
        .map((filePath) => path.relative(rootDir, filePath))
        .join(", ")}`
);
