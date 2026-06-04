import "./config.ts";

import {
    createScheduleRegistry,
    registerBuiltinQueueSchedules,
    scheduleCall,
    scheduleJob,
    type ScheduleRegistry,
} from "@shanjing/astro-full-stack-starter/queue";

import { ExecutionRecordCleanupQueueJob } from "@shanjing/astro-full-stack-starter/queue/jobs";
import { FailedJobsAuditQueueJob } from "@shanjing/astro-full-stack-starter/queue/jobs";
import { QueueMetricsSnapshotQueueJob } from "@shanjing/astro-full-stack-starter/queue/jobs";
import { SystemHealthCheckQueueJob } from "./jobs/system-health-check.job.ts";
import { queueRuntime } from "./runtime.ts";

function registerProjectSchedules(registry: ScheduleRegistry) {
    scheduleJob(registry, new SystemHealthCheckQueueJob(), "*/15 * * * *", {
        description: "每 15 分钟执行一次首页健康检查任务。",
        name: "homepage-system-health-check",
        runtime: queueRuntime,
    });

    // 如果某个任务需要固定参数，可以直接用 payload：
    //
    scheduleJob(registry, new FailedJobsAuditQueueJob(), "0 8 * * *", {
        name: "failed-jobs-audit-morning",
        payload: {
            requestedAt: new Date().toISOString(),
            source: "scheduler",
            windowSize: 100,
        },
        runtime: queueRuntime,
    });
    //
    // 如果参数需要根据当前触发时间动态计算，使用 buildPayload：
    //
    // scheduleJob(registry, new ExecutionRecordCleanupQueueJob(), "30 4 * * *", {
    //     name: "execution-record-cleanup-dynamic",
    //     buildPayload({ now }) {
    //         return {
    //             maxAgeHours: now.getDay() === 1 ? 24 * 30 : 24 * 7,
    //             maxRecordsPerStatus: 500,
    //             requestedAt: now.toISOString(),
    //             source: "scheduler",
    //         };
    //     },
    // });

    // 如果不需要显式 job，也可以像 Laravel schedule->call() 一样直接写匿名函数：
    //
    // scheduleCall(
    //     registry,
    //     async () => {
    //         const url = "https://example.com/internal/monthly-check";
    //         await fetch(url).then((response) => response.text());
    //     },
    //     "0 11 1 * *",
    //     {
    //         description: "每月 1 号 11 点触发外部检查。",
    //         name: "monthly-external-check",
    //     }
    // );
    //
    // 一个 scheduleCall 也可以一次派发多个队列任务：
    //
    scheduleCall(
        registry,
        async () => {
            await new QueueMetricsSnapshotQueueJob().dispatch(queueRuntime);
            await new FailedJobsAuditQueueJob().dispatch(queueRuntime, {
                requestedAt: new Date().toISOString(),
                source: "scheduler",
                windowSize: 100,
            });
        },
        "0 8 * * *",
        {
            description: "每天早上 8 点同时触发多个队列任务。",
            name: "morning-maintenance-batch",
        }
    );
}

export function createQueueKernel() {
    const registry = createScheduleRegistry();

    registerBuiltinQueueSchedules(registry, queueRuntime);
    registerProjectSchedules(registry);

    return registry;
}

export function getRegisteredSchedules() {
    return createQueueKernel().getAll();
}

export { ExecutionRecordCleanupQueueJob, FailedJobsAuditQueueJob, QueueMetricsSnapshotQueueJob };
export { scheduleCall, scheduleJob };
