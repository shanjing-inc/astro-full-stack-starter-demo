import queueConfig from "./config.json" with { type: "json" };
import { configureQueueRuntime } from "@shanjing/astro-full-stack-starter/queue";

configureQueueRuntime(queueConfig);

export {
    configureQueueRuntime,
    defaultQueueRuntimeConfiguration,
    getActiveQueueNames,
    getQueueConfigByQueueName,
    getQueueConfigs,
    getQueueExecutionRecordTtlSeconds,
    getQueueJobRetentionCount,
    getQueueJobRetentionSeconds,
    getQueueRuntimeConfiguration,
    getQueueSchedulerConfig,
    getQueueSchedulerRuntimeConfig,
    queueConfigs,
    queueDashboardRedisConnectTimeoutMs,
    queueDashboardRedisReadyTimeoutMs,
    QueueConfigurationError,
} from "@shanjing/astro-full-stack-starter/queue/config";

export type {
    QueueConfig,
    QueuePm2Config,
    QueueRuntimeConfiguration,
    QueueRuntimeConfigurationInput,
    QueueRuntimeQueueConfig,
    QueueSchedulerConfig,
} from "@shanjing/astro-full-stack-starter/queue/config";

export {
    createQueueRedisConnection,
    getBullMqPrefix,
} from "@shanjing/astro-full-stack-starter/queue/adapters/bullmq";
