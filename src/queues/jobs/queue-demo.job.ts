import { z } from "zod";

import { BaseQueueJob } from "@shanjing/astro-full-stack-starter/queue/core";
import {
    defineJob,
    type JobDispatchMetadata,
    type JobHandlerContext,
    type JobRegistry,
    type QueueDispatchResult,
    type QueueRuntime,
} from "@shanjing/astro-full-stack-starter/queue/core";

import {
    cloudflareQueueConfigs,
    getCloudflareQueueConfig,
    type CloudflareQueueName,
} from "@/queues/config";

const queueDemoJobParams = z.object({
    mode: z.enum(["success", "fail-once", "always-fail"]).default("success"),
    queue: z.string().optional(),
    requestedAt: z.iso.datetime(),
    source: z.enum(["queue-test-page"]),
});

function createQueueDemoJobDefinition(queueName: CloudflareQueueName) {
    return defineJob<QueueDemoJobData>({
        name: "cloudflare-queue-demo",
        queueName,
        description: `Cloudflare Queues demo 任务（${queueName}）。`,
        displayName: `Cloudflare Queue Demo ${queueName}`,
        params: queueDemoJobParams,
    });
}

export type QueueDemoJobData = z.infer<typeof queueDemoJobParams>;

export class QueueDemoQueueJob extends BaseQueueJob<QueueDemoJobData> {
    constructor(queueName: CloudflareQueueName) {
        super(createQueueDemoJobDefinition(queueName));
    }

    handle({ data, job }: JobHandlerContext<QueueDemoJobData>) {
        if (data.mode === "always-fail") {
            throw new Error("演示任务被配置为持续失败，用于观察 failed 记录。");
        }

        if (data.mode === "fail-once" && job.attemptsMade <= 1) {
            throw new Error("演示任务首次执行失败，Cloudflare Queues 会触发 retry。");
        }

        return {
            completedAt: new Date().toISOString(),
            jobId: job.id,
            mode: data.mode,
            queue: data.queue ?? job.queueName,
        };
    }
}

export function getCloudflareQueueDemoJobDefinitions() {
    return cloudflareQueueConfigs.map((config) => new QueueDemoQueueJob(config.name));
}

export function findCloudflareQueueDemoJob(queueName: string, jobName: string) {
    return (
        getCloudflareQueueDemoJobDefinitions().find(
            (job) => job.jobDefinition.queueName === queueName && job.jobDefinition.name === jobName
        ) ?? null
    );
}

export function dispatchCloudflareQueueDemoJob(
    runtime: QueueRuntime,
    queueName: CloudflareQueueName,
    jobData: QueueDemoJobData,
    dispatchMeta?: JobDispatchMetadata
): Promise<QueueDispatchResult> {
    const config = getCloudflareQueueConfig(queueName);

    if (!config) {
        return Promise.resolve({
            message: `未知 Cloudflare 队列：${queueName}`,
            ok: false,
            reason: "validation_error",
        });
    }

    const queueJob = new QueueDemoQueueJob(config.name);

    return queueJob.dispatch(
        runtime,
        {
            ...jobData,
            queue: config.name,
        },
        dispatchMeta
    );
}

export function registerQueueDemoJobs(registry: JobRegistry) {
    for (const job of getCloudflareQueueDemoJobDefinitions()) {
        job.register(registry);
    }
}
