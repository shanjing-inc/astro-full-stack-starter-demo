import { z } from "zod";

import {
    BaseQueueJob,
    defineJob,
    type JobDispatchMetadata,
    type JobHandlerContext,
} from "@shanjing/astro-full-stack-starter/queue/core";

export class DemoPageVisitQueueJob extends BaseQueueJob<DemoPageVisitJobData> {
    static readonly params = z.object({
        pathname: z.string().trim().min(1),
        requestedAt: z.iso.datetime(),
        source: z.enum(["index-page", "scheduler"]),
    });

    static readonly definition = defineJob<DemoPageVisitJobData>({
        name: "demo-page-visit",
        queueName: "default",
        description: "示例页面访问记录任务。",
        displayName: "Demo Page Visit",
        params: DemoPageVisitQueueJob.params,
    });

    constructor() {
        super(DemoPageVisitQueueJob.definition);
    }

    protected createDefaultData(dispatchMeta?: JobDispatchMetadata): DemoPageVisitJobData {
        return {
            pathname: "/",
            requestedAt: new Date().toISOString(),
            source: dispatchMeta?.source === "schedule" ? "scheduler" : "index-page",
        };
    }

    async handle({ data: jobData, job }: JobHandlerContext<DemoPageVisitJobData>) {
        const consumedAt = new Date().toISOString();

        console.log(`[bullmq-demo] Consumed job ${job.id ?? "unknown"} from ${job.queueName}.`);
        console.log(
            JSON.stringify(
                {
                    jobId: job.id ?? null,
                    jobName: job.name,
                    queueName: job.queueName,
                    payload: jobData,
                    consumedAt,
                },
                null,
                4
            )
        );

        return {
            consumedAt,
            pathname: jobData.pathname,
        };
    }
}

export type DemoPageVisitJobData = z.infer<typeof DemoPageVisitQueueJob.params>;
