import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Database test page", () => {
    it("formats the browser time from a UTC diagnostic instant", () => {
        const pageSource = readFileSync(path.resolve("src/pages/test/database.astro"), "utf8");

        expect(pageSource).toContain('<BaseLayout title="Database Test">');
        expect(pageSource).toContain("DATE_FORMAT(UTC_TIMESTAMP, '%Y-%m-%dT%H:%i:%sZ')");
        expect(pageSource).toContain('"id,"');
        expect(pageSource).toContain("CAST(created_at AS CHAR) as createdAtRaw");
        expect(pageSource).toContain("data-browser-local-time");
        expect(pageSource).toContain("data-browser-current-time");
        expect(pageSource).toContain("浏览器时间");
        expect(pageSource).not.toContain("UTC 时间：");
        expect(pageSource.includes("时间诊断")).toBe(false);
        expect(pageSource).toContain("MySQL 会话时间");
        expect(pageSource).toContain(
            "mt-4 grid gap-6 text-sm text-muted-foreground lg:grid-cols-2"
        );
        expect(pageSource).toContain('<div class="space-y-3">');
        expect(pageSource).toContain("createdAt（数据库原始值）");
        expect(pageSource).toContain("createdAt（本地时间）");
        expect(pageSource).toContain("navigator.languages");
        expect(pageSource).toContain("Intl.DateTimeFormat(browserLocale");
    });

    it("guides IANA time zone setup for MySQL time zone table errors", () => {
        const pageSource = readFileSync(path.resolve("src/pages/test/database.astro"), "utf8");

        expect(pageSource).toContain("Unknown or incorrect time zone");
        expect(pageSource).toContain("mysql_tzinfo_to_sql /usr/share/zoneinfo");
        expect(pageSource).toContain("SELECT CONVERT_TZ");
    });

    it("handles random shop creation with a daily MySQL date limit", () => {
        const pageSource = readFileSync(path.resolve("src/pages/test/database.astro"), "utf8");

        expect(pageSource).toContain("RANDOM_SHOP_ACTION");
        expect(pageSource).toContain('Astro.request.method === "POST"');
        expect(pageSource).toContain("RANDOM_SHOP_DAILY_LIMIT = 5");
        expect(pageSource).toContain("CURRENT_DATE");
        expect(pageSource).toContain("DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)");
        expect(pageSource).toContain("新增随机店铺");
    });
});
