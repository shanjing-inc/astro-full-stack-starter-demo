export const cloudflareQueueConfigs = [
    {
        name: "critical",
        description: "高优先级任务队列",
        binding: "QUEUE_CRITICAL",
    },
    {
        name: "default",
        description: "默认优先级任务队列",
        binding: "QUEUE_DEFAULT",
    },
    {
        name: "low",
        description: "低优先级任务队列",
        binding: "QUEUE_LOW",
        consumerMaxConcurrency: 1,
    },
] as const;

export type CloudflareQueueName = (typeof cloudflareQueueConfigs)[number]["name"];

export const cloudflareQueueNames = cloudflareQueueConfigs.map((config) => config.name) as [
    CloudflareQueueName,
    ...CloudflareQueueName[],
];

export function getCloudflareQueueConfig(queueName: string) {
    return cloudflareQueueConfigs.find((config) => config.name === queueName) ?? null;
}

export function isCloudflareQueueName(value: string): value is CloudflareQueueName {
    return getCloudflareQueueConfig(value) !== null;
}
