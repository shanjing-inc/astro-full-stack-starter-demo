import { createBuilder } from "@/graphql/builder";
import { dbSchema } from "@/db/schemas";
import {
    registerCreateOrderMutation,
    registerDeleteOrderMutation,
    registerUpdateOrderMutation,
} from "@/graphql/mutations/order";
import {
    registerCreateProductMutation,
    registerDeleteProductMutation,
    registerUpdateProductMutation,
} from "@/graphql/mutations/product";
import {
    registerCreateShopMutation,
    registerDeleteShopMutation,
    registerUpdateShopMutation,
} from "@/graphql/mutations/shop";
import { registerGetOrderQuery, registerListOrdersQuery } from "@/graphql/queries/order";
import { registerGetProductQuery, registerListProductsQuery } from "@/graphql/queries/product";
import { registerGetShopQuery, registerListShopsQuery } from "@/graphql/queries/shop";
import { registerOrderTypes } from "@/graphql/types/order";
import { registerProductTypes } from "@/graphql/types/product";
import { registerShopTypes } from "@/graphql/types/shop";
import { registerCommonTypes } from "@shanjing/astro-full-stack-starter/graphql/types/common";
import { cloudflareQueueConfigs, getCloudflareQueueConfig } from "@/queues/config";
import { findCloudflareQueueDemoJob, type QueueDemoJobData } from "@/queues/jobs/queue-demo.job";
import { registerDashboardGraphQLSchema } from "@shanjing/astro-full-stack-starter/graphql/schemas/dashboard";
import { createExecutionStoreQueueDashboardBackend } from "@shanjing/astro-full-stack-starter/queue/dashboard";

import type { GraphQLContext } from "@/graphql/context";
import type { QueueExecutionRecord } from "@shanjing/astro-full-stack-starter/queue/core";

const builder = createBuilder();
const commonTypes = registerCommonTypes(builder);
const orderTypes = registerOrderTypes(builder, commonTypes);
const productTypes = registerProductTypes(builder, commonTypes);
const shopTypes = registerShopTypes(builder, commonTypes);

function isRetryableQueueDemoPayload(value: unknown): value is QueueDemoJobData {
    if (!value || typeof value !== "object") {
        return false;
    }

    const payload = value as Partial<QueueDemoJobData>;
    const queueName = typeof payload.queue === "string" ? payload.queue : null;

    return (
        Boolean(queueName && getCloudflareQueueConfig(queueName)) &&
        typeof payload.requestedAt === "string" &&
        payload.source === "queue-test-page" &&
        (payload.mode === "success" ||
            payload.mode === "fail-once" ||
            payload.mode === "always-fail")
    );
}

async function findQueueExecutionRecord(context: GraphQLContext, recordId: string) {
    const records = context.queueExecutionStore.getRecent
        ? await context.queueExecutionStore.getRecent(500)
        : [];

    return records.find((record) => record.id === recordId) ?? null;
}

async function retryQueueExecutionRecord(context: GraphQLContext, record: QueueExecutionRecord) {
    if (!isRetryableQueueDemoPayload(record.payload)) {
        return {
            message: "当前任务 payload 不支持重试。",
            ok: false,
        };
    }

    const queueJob = findCloudflareQueueDemoJob(record.queueName, record.jobName);

    if (!queueJob) {
        return {
            message: "当前任务不是 Cloudflare demo 队列任务，无法重试。",
            ok: false,
        };
    }

    const result = await context.queueRuntime.dispatch(
        queueJob.jobDefinition,
        {
            ...record.payload,
            requestedAt: new Date().toISOString(),
        },
        {
            dispatchMeta: {
                dispatchedAt: new Date().toISOString(),
                retryOfRecordId: record.id,
                source: "manual",
            },
        }
    );

    if (!result.ok) {
        return result;
    }

    return {
        jobId: result.jobId,
        message: `已重新投递队列任务 ${result.jobId ?? "-"}`,
        ok: true,
        record: await findQueueExecutionRecord(
            context,
            `${record.queueName}::${result.jobId ?? ""}`
        ),
    };
}

registerDashboardGraphQLSchema(builder, {
    commonTypes,
    getQueueDashboardBackend: (context: GraphQLContext) =>
        createExecutionStoreQueueDashboardBackend({
            capabilities: {
                supportsRetry: true,
                supportsSchedules: true,
            },
            executionStore: context.queueExecutionStore,
            queues: cloudflareQueueConfigs.map((config) => ({
                binding: config.binding,
                description: `${config.description}（Cloudflare Queues + D1）`,
                queueName: config.name,
            })),
            retryRecord: (record) => retryQueueExecutionRecord(context, record),
            schedules: [
                {
                    cron: "30 4 * * *",
                    description:
                        "Cloudflare scheduled event cleans expired D1 queue execution records.",
                    jobName: "cleanupQueueExecutionRecords",
                    name: "cloudflare-queue-execution-cleanup",
                    queueName: cloudflareQueueConfigs[0].name,
                },
            ],
        }),
    userTable: dbSchema.user,
});

registerGetOrderQuery(builder, orderTypes);
registerListOrdersQuery(builder, orderTypes);
registerGetProductQuery(builder, productTypes);
registerListProductsQuery(builder, productTypes);
registerGetShopQuery(builder, shopTypes);
registerListShopsQuery(builder, shopTypes);
registerCreateOrderMutation(builder, orderTypes);
registerDeleteOrderMutation(builder, orderTypes);
registerUpdateOrderMutation(builder, orderTypes);
registerCreateProductMutation(builder, productTypes);
registerDeleteProductMutation(builder, productTypes);
registerUpdateProductMutation(builder, productTypes);
registerCreateShopMutation(builder, shopTypes);
registerDeleteShopMutation(builder, shopTypes);
registerUpdateShopMutation(builder, shopTypes);

export const adminSchema = builder.toSchema({});

export default adminSchema;
