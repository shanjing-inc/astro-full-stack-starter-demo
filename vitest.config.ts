import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(rootDir, "src"),
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
        globalSetup: ["./tests/fixtures/sqlite/setup.ts"],
        include: ["tests/**/*.test.{ts,tsx}"],
        setupFiles: ["./tests/setup/vitest.setup.ts"],
        testTimeout: 30_000,
    },
});
