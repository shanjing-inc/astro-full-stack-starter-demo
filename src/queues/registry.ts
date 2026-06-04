import { createJobRegistry } from "@shanjing/astro-full-stack-starter/queue/core";

import { registerQueueDemoJobs } from "@/queues/jobs/queue-demo.job";

export function createCloudflareQueueRegistry() {
    const registry = createJobRegistry();

    registerQueueDemoJobs(registry);

    return registry;
}
