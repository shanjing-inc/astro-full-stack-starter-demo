import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readProjectFile(relativePath: string) {
    return readFileSync(path.join(rootDir, relativePath), "utf8");
}

describe("Deno queue test page", () => {
    it("uses the default success color for all success dispatch actions", () => {
        const testQueuePage = readProjectFile("src/pages/test/queue.astro");

        expect(testQueuePage).toContain(
            "const defaultSuccessButtonClass = queueTones.default?.button ?? queueTones.fallback.button;"
        );
        expect(testQueuePage).toContain("${defaultSuccessButtonClass}");
        expect(testQueuePage).toContain("刷新执行状态");
        expect(testQueuePage).toContain('data-preserve-scroll="queue-status-refresh"');
        expect(testQueuePage).toContain('const scrollStorageKey = "queue-test:scroll-y";');
        expect(testQueuePage).toContain(
            'window.scrollTo({ top: savedScrollY, behavior: "instant" });'
        );
        expect(testQueuePage).toContain("border-emerald-600 bg-emerald-600");
        expect(testQueuePage).toContain(
            'import { createQueueExecutionStore } from "@/queues/runtime";'
        );
        expect(testQueuePage).toContain("const executionStore = createQueueExecutionStore();");
        expect(testQueuePage).toContain("executionStore.close();");
        expect(testQueuePage).toContain("最近执行记录");
        expect(testQueuePage).toContain("刷新页面可查看 BullMQ worker 写回 Redis 的最新状态。");
        expect(testQueuePage).toContain("暂无执行记录。投递任务后会先写入 queued 记录。");
        expect(testQueuePage).toContain("records = executionStore.getRecent");
        expect(testQueuePage).not.toContain("createRedisQueueExecutionStore");
        expect(testQueuePage).not.toContain('createQueueRedisConnection("producer")');
        expect(testQueuePage).not.toContain("${tone.button}");
        expect(testQueuePage).not.toContain('value="all"');
        expect(testQueuePage).not.toContain("同时触发所有");
        expect(testQueuePage).not.toContain("全部失败一次");
        expect(testQueuePage).not.toContain("派发所有队列任务");
    });
});
