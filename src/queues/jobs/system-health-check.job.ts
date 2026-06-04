import { z } from "zod";

import {
    BaseQueueJob,
    defineJob,
    type JobDispatchMetadata,
    type JobHandlerContext,
} from "@shanjing/astro-full-stack-starter/queue/core";

function createSystemHealthCheckJobData(
    source: SystemHealthCheckJobData["source"] = "index-page"
): SystemHealthCheckJobData {
    return {
        component: "homepage",
        requestedAt: new Date().toISOString(),
        source,
        status: "needs-review",
    };
}

export class SystemHealthCheckQueueJob extends BaseQueueJob<SystemHealthCheckJobData> {
    static readonly params = z.object({
        component: z.literal("homepage"),
        requestedAt: z.iso.datetime(),
        source: z.enum(["index-page", "scheduler"]),
        status: z.literal("needs-review"),
    });

    static readonly definition = defineJob<SystemHealthCheckJobData>({
        name: "system-health-check",
        queueName: "critical",
        description: "示例系统健康检查任务。",
        displayName: "System Health Check",
        params: SystemHealthCheckQueueJob.params,
    });

    constructor() {
        super(SystemHealthCheckQueueJob.definition);
    }

    protected createDefaultData(dispatchMeta?: JobDispatchMetadata): SystemHealthCheckJobData {
        const source = dispatchMeta?.source === "schedule" ? "scheduler" : "index-page";

        return createSystemHealthCheckJobData(source);
    }

    async handle({ data: jobData, job }: JobHandlerContext<SystemHealthCheckJobData>) {
        const handledAt = new Date().toISOString();

        console.log(
            `[queue:critical-demo] Handled job ${job.id ?? "unknown"} from ${job.queueName}.`
        );
        console.log(
            JSON.stringify(
                {
                    handledAt,
                    jobId: job.id ?? null,
                    jobName: job.name,
                    payload: jobData,
                    queueName: job.queueName,
                },
                null,
                4
            )
        );

        return {
            component: jobData.component,
            handledAt,
            status: "queued-for-attention",
        };
    }
}

export type SystemHealthCheckJobData = z.infer<typeof SystemHealthCheckQueueJob.params>;
