import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("Cloudflare D1 business migration", () => {
    it("backfills every business table for environments with an older initial migration", () => {
        const migrationSql = readFileSync(
            path.join(rootDir, "drizzle/0001_business_tables.sql"),
            "utf8"
        );

        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "shop"');
        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "product"');
        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "order"');
        expect(migrationSql).toContain('CREATE TRIGGER IF NOT EXISTS "shop_updated_at_trigger"');
        expect(migrationSql).toContain(
            'FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON UPDATE no action ON DELETE cascade'
        );
    });

    it("adds queue execution storage for Cloudflare Queues demo", () => {
        const migrationSql = readFileSync(
            path.join(rootDir, "drizzle/0002_queue_execution.sql"),
            "utf8"
        );

        expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "queue_execution"');
        expect(migrationSql).toContain('"job_id" text NOT NULL');
        expect(migrationSql).toContain('"status" text DEFAULT');
        expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "queue_execution_status_idx"');
    });
});
