import { describe, expect, it } from "vitest";

import { cloudflareQueueConfigs } from "@/queues/config";
import {
    dispatchCloudflareQueueDemoJob,
    getCloudflareQueueDemoJobDefinitions,
} from "@/queues/jobs/queue-demo.job";

import type {
    JobDefinition,
    QueueDispatchOptions,
    QueueRuntime,
} from "@shanjing/astro-full-stack-starter/queue/core";

describe("Cloudflare queue demo jobs", () => {
    it("matches the Deno demo priority queue channels", () => {
        expect(cloudflareQueueConfigs).toMatchObject([
            {
                binding: "QUEUE_CRITICAL",
                description: "高优先级任务队列",
                name: "critical",
            },
            {
                binding: "QUEUE_DEFAULT",
                description: "默认优先级任务队列",
                name: "default",
            },
            {
                binding: "QUEUE_LOW",
                consumerMaxConcurrency: 1,
                description: "低优先级任务队列",
                name: "low",
            },
        ]);
        expect(cloudflareQueueConfigs).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    queueName: expect.stringContaining("astro-full-stack-cloudflare-d1-demo"),
                }),
            ])
        );
    });

    it("registers one handler per logical queue name", () => {
        expect(
            getCloudflareQueueDemoJobDefinitions().map((job) => ({
                name: job.jobDefinition.name,
                queueName: job.jobDefinition.queueName,
            }))
        ).toEqual([
            {
                name: "cloudflare-queue-demo",
                queueName: "critical",
            },
            {
                name: "cloudflare-queue-demo",
                queueName: "default",
            },
            {
                name: "cloudflare-queue-demo",
                queueName: "low",
            },
        ]);
    });

    it("dispatches each queue by application queue name", async () => {
        const dispatched: Array<{
            data: unknown;
            definition: JobDefinition<unknown>;
            options?: QueueDispatchOptions;
        }> = [];
        const runtime: QueueRuntime = {
            async dispatch(definition, data, options) {
                dispatched.push({
                    data,
                    definition: definition as JobDefinition<unknown>,
                    options,
                });

                return {
                    jobId: "job-1",
                    ok: true,
                };
            },
        };

        await expect(
            dispatchCloudflareQueueDemoJob(runtime, "low", {
                mode: "success",
                requestedAt: "2026-05-25T00:00:00.000Z",
                source: "queue-test-page",
            })
        ).resolves.toEqual({
            jobId: "job-1",
            ok: true,
        });
        expect(dispatched).toMatchObject([
            {
                data: {
                    queue: "low",
                },
                definition: {
                    name: "cloudflare-queue-demo",
                    queueName: "low",
                },
            },
        ]);
    });
});
