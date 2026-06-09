import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

function loadEnvFile(filePath: string) {
    if (!existsSync(filePath)) {
        return;
    }

    const envContent = readFileSync(filePath, "utf8");

    for (const rawLine of envContent.split(/\r?\n/u)) {
        const line = rawLine.trim();

        if (!line || line.startsWith("#")) {
            continue;
        }

        const normalizedLine = line.startsWith("export ") ? line.slice(7).trim() : line;
        const separatorIndex = normalizedLine.indexOf("=");

        if (separatorIndex <= 0) {
            continue;
        }

        const key = normalizedLine.slice(0, separatorIndex).trim();

        if (!key || process.env[key] !== undefined) {
            continue;
        }

        let value = normalizedLine.slice(separatorIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    }
}

loadEnvFile(resolve(process.cwd(), "../../.env"));
loadEnvFile(resolve(process.cwd(), ".env"));

if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL for Drizzle config.");
}
export default defineConfig({
    dialect: "mysql",
    schema: "./src/db/schemas.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    strict: true,
    verbose: true,
});
