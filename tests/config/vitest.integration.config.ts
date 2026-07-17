import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDir, "../..");

export default defineConfig({
    root: projectRoot,
    resolve: {
        alias: {
            "@": path.join(projectRoot, "src"),
        },
    },
    test: {
        globalSetup: [path.join(projectRoot, "tests/integration/fixtures/sqlite/setup.ts")],
        include: ["tests/integration/**/*.test.{ts,tsx}"],
        name: "integration",
        setupFiles: [path.join(projectRoot, "tests/shared/vitest.setup.ts")],
        testTimeout: 30_000,
    },
});
