import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDir, "../..");

export default defineConfig({
    testDir: path.join(projectRoot, "tests/e2e/specs"),
    timeout: 30_000,
    retries: process.env.CI ? 2 : 0,
    reporter: "list",
    use: {
        baseURL: "http://127.0.0.1:4321",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
    webServer: {
        command: "pnpm run dev --host 127.0.0.1 --port 4321",
        cwd: projectRoot,
        url: "http://127.0.0.1:4321",
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        env: {
            DATABASE_URL:
                "mysql://root:password@127.0.0.1:3306/test_astro_with_deno?drizzleMode=default",
            REDIS_URL: "redis://127.0.0.1:6379/0",
            TZ: "UTC",
        },
    },
});
