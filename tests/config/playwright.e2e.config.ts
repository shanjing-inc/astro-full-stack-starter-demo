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
        baseURL: "http://127.0.0.1:4322",
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
        command: "pnpm run dev --host 127.0.0.1 --port 4322",
        cwd: projectRoot,
        url: "http://127.0.0.1:4322",
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        env: {
            BETTER_AUTH_ALLOWED_HOSTS: "localhost:*,127.0.0.1:*",
            BETTER_AUTH_SECRET: "cloudflare-d1-demo-local-secret-please-change",
        },
    },
});
