import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../../..", import.meta.url));
const sourceRoot = path.join(projectRoot, "src");
const sourceExtensions = new Set([".astro", ".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const skippedDirectoryNames = new Set(["generated"]);
const forbiddenOriginalErrorPatterns = [
    /\bextensions\s*(?:\?\.|\.)\s*originalError\b/,
    /\bextensions\s*(?:\?\.)?\s*\[\s*["']originalError["']\s*\]/,
];

async function listSourceFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            if (!skippedDirectoryNames.has(entry.name)) {
                files.push(...(await listSourceFiles(entryPath)));
            }

            continue;
        }

        if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
            files.push(entryPath);
        }
    }

    return files;
}

function containsForbiddenOriginalErrorAccess(source: string) {
    return forbiddenOriginalErrorPatterns.some((pattern) => pattern.test(source));
}

describe("GraphQL original error guard", () => {
    it("keeps demo source code from reading GraphQL response extensions.originalError", async () => {
        const sourceFiles = await listSourceFiles(sourceRoot);
        const violatingFiles: string[] = [];

        for (const file of sourceFiles) {
            const source = await readFile(file, "utf8");

            if (containsForbiddenOriginalErrorAccess(source)) {
                violatingFiles.push(path.relative(projectRoot, file));
            }
        }

        expect(violatingFiles).toEqual([]);
    });
});
