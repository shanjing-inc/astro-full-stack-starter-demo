import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDir, "../..");
const setupFile = path.join(projectRoot, "tests/shared/vitest.setup.ts");

export default defineConfig({
    root: projectRoot,
    resolve: {
        alias: {
            "@": path.join(projectRoot, "src"),
        },
    },
    test: {
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "json-summary"],
            thresholds: {
                statements: 95,
                branches: 95,
                functions: 95,
                lines: 95,
                perFile: true,
            },
        },
        projects: [
            {
                extends: true,
                test: {
                    include: ["tests/unit/**/*.test.{ts,tsx}"],
                    name: "unit",
                    setupFiles: [setupFile],
                    testTimeout: 30_000,
                },
            },
            {
                extends: true,
                test: {
                    globalSetup: [
                        path.join(projectRoot, "tests/integration/fixtures/sqlite/setup.ts"),
                    ],
                    include: ["tests/integration/**/*.test.{ts,tsx}"],
                    name: "integration",
                    setupFiles: [setupFile],
                    testTimeout: 30_000,
                },
            },
        ],
    },
});
