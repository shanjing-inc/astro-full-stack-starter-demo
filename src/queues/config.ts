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
    getQueueProcessGroups,
    getQueueRuntimeConfiguration,
    getQueueSchedulerConfig,
    getQueueSchedulerRuntimeConfig,
    queueConfigs,
    queueDashboardRedisConnectTimeoutMs,
    queueDashboardRedisReadyTimeoutMs,
    QueueConfigurationError,
    resolveQueueWorkerProcessSpecs,
} from "@shanjing/astro-full-stack-starter/queue/config";

export type {
    QueueConfig,
    QueuePm2Config,
    QueueProcessGroupConfig,
    QueueRuntimeConfiguration,
    QueueRuntimeConfigurationInput,
    QueueRuntimeQueueConfig,
    QueueSchedulerConfig,
    QueueWorkerProcessSpec,
} from "@shanjing/astro-full-stack-starter/queue/config";

export {
    createQueueRedisConnection,
    getBullMqPrefix,
} from "@shanjing/astro-full-stack-starter/queue/adapters/bullmq";
