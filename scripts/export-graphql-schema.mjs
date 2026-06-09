import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { printSchema } from "graphql";

process.env.TZ ??= "UTC";

const workspaceRoot = resolve(import.meta.dirname, "..");
const srcRoot = resolve(workspaceRoot, "src");
const generatedDir = resolve(workspaceRoot, "src/graphql/generated");
const adminSchemaOutputPath = resolve(generatedDir, "admin-schema.graphql");
const adminSchemaPath = resolve(workspaceRoot, "src/graphql/schemas/admin.ts");
const memberSchemaOutputPath = resolve(generatedDir, "member-schema.graphql");
const memberSchemaPath = resolve(workspaceRoot, "src/graphql/schemas/member.ts");
const supportedExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"];

function resolveAliasPath(specifier) {
    if (!specifier.startsWith("@/")) {
        return null;
    }

    const requestedPath = resolve(srcRoot, specifier.slice(2));

    if (extname(requestedPath) && existsSync(requestedPath)) {
        return requestedPath;
    }

    for (const extension of supportedExtensions) {
        const filePath = `${requestedPath}${extension}`;

        if (existsSync(filePath)) {
            return filePath;
        }
    }

    for (const extension of supportedExtensions) {
        const indexPath = resolve(requestedPath, `index${extension}`);

        if (existsSync(indexPath)) {
            return indexPath;
        }
    }

    return requestedPath;
}

registerHooks({
    resolve(specifier, context, nextResolve) {
        const resolvedAliasPath = resolveAliasPath(specifier);

        if (resolvedAliasPath) {
            return nextResolve(pathToFileURL(resolvedAliasPath).href, context);
        }

        return nextResolve(specifier, context);
    },
});

const [{ adminSchema }, { memberSchema }] = await Promise.all([
    import(pathToFileURL(adminSchemaPath).href),
    import(pathToFileURL(memberSchemaPath).href),
]);

await mkdir(generatedDir, { recursive: true });
await Promise.all([
    writeFile(adminSchemaOutputPath, `${printSchema(adminSchema)}\n`, "utf8"),
    writeFile(memberSchemaOutputPath, `${printSchema(memberSchema)}\n`, "utf8"),
]);
