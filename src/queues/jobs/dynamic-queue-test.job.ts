import { z } from "zod";

import "../config.ts";
import { createRedisQueueNamespace } from "@shanjing/astro-full-stack-starter/queue/stores/redis";

import {
    BaseQueueJob,
    type JobRegistry,
    type QueueDispatchResult,
    type QueueJobHandle,
    type QueueName,
    queueNames,
    defineJob,
    type JobDispatchMetadata,
    type JobHandlerContext,
} from "@shanjing/astro-full-stack-starter/queue/core";
import { createQueueRedisConnection } from "../config.ts";
import { queueRuntime } from "../runtime.ts";

const dynamicTestKeys = createRedisQueueNamespace("queue:dynamic-test");
const failOnceStateTtlSeconds = 60 * 60;

let failOnceStateRedis: ReturnType<typeof createQueueRedisConnection> | null = null;

function getFailOnceStateRedis() {
    if (!failOnceStateRedis) {
        failOnceStateRedis = createQueueRedisConnection("worker");
    }

    return failOnceStateRedis;
}

function getFailOnceStateKey(job: QueueJobHandle<DynamicQueueTestJobData>) {
    return dynamicTestKeys.key(`fail-once:${job.queueName}:${job.id ?? "unknown"}`);
}

class DynamicQueueTestQueueJob extends BaseQueueJob<DynamicQueueTestJobData> {
    static readonly params = z.object({
        queue: z.string(),
        mode: z.enum(["success", "fail-once", "always-fail"]).default("success"),
        requestedAt: z.iso.datetime(),
        source: z.enum(["index-page", "queue-test-page"]),
    });

    static createDefinition(queueName: QueueName) {
        return defineJob<DynamicQueueTestJobData>({
            queueName,
            description: `动态队列测试任务（${queueName}）`,
            displayName: `Dynamic Queue Test ${queueName}`,
            name: `dynamic-queue-test-${queueName}`,
            params: DynamicQueueTestQueueJob.params,
        });
    }

    constructor(queueName: QueueName) {
        super(DynamicQueueTestQueueJob.createDefinition(queueName));
    }

    async handle({ data: jobData, job }: JobHandlerContext<DynamicQueueTestJobData>) {
        const consumedAt = new Date().toISOString();
        const failOnceStateKey = getFailOnceStateKey(job);

        if (jobData.mode === "always-fail") {
            throw new Error("演示任务被配置为持续失败，用于观察 failed 列表。");
        }

        if (jobData.mode === "fail-once") {
            const failOnceStateRedis = getFailOnceStateRedis();
            const hasFailedOnce = await failOnceStateRedis.get(failOnceStateKey);

            if (!hasFailedOnce) {
                await failOnceStateRedis.set(
                    failOnceStateKey,
                    consumedAt,
                    "EX",
                    failOnceStateTtlSeconds
                );
                throw new Error("演示任务首次执行失败；请点击 Retry 观察其进入 completed 列表。");
            }
        }

        console.log(
            `[dynamic-queue-test] Consumed job ${job.id ?? "unknown"} from ${job.queueName}.`
        );
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
            queue: jobData.queue,
        };
    }
}

export function dispatchDynamicQueueTestJob(
    queueName: QueueName,
    jobData: DynamicQueueTestJobData,
    dispatchMeta?: JobDispatchMetadata
): Promise<QueueDispatchResult> {
    const queueJob = new DynamicQueueTestQueueJob(queueName);

    return queueJob.dispatch(
        queueRuntime,
        {
            ...jobData,
            queue: queueName,
        },
        dispatchMeta
    );
}

function registerDynamicQueueTestJob(registry: JobRegistry, queueName: QueueName) {
    new DynamicQueueTestQueueJob(queueName).register(registry);
}

function registerAllDynamicQueueTestJobs(registry: JobRegistry, configuredQueueNames: QueueName[]) {
    for (const queueName of configuredQueueNames) {
        registerDynamicQueueTestJob(registry, queueName);
    }
}

export function registerJob(registry: JobRegistry) {
    registerAllDynamicQueueTestJobs(registry, [...queueNames]);
}

export type DynamicQueueTestJobData = z.infer<typeof DynamicQueueTestQueueJob.params>;
