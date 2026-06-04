import "./config.ts";

import { startRegisteredWorkers } from "@shanjing/astro-full-stack-starter/queue/adapters/bullmq";
import {
    type JobRegistry,
    type QueueName,
    queueNames,
} from "@shanjing/astro-full-stack-starter/queue/core";
import { createQueueJobRegistry } from "./runtime.ts";

interface StartQueueWorkersOptions {
    queueNames?: QueueName[];
}

function resolveWorkerQueueNames(registry: JobRegistry, requestedQueueNames?: QueueName[]) {
    const registeredQueueNames = new Set(registry.getQueueNames());
    const resolvedQueueNames = (
        requestedQueueNames && requestedQueueNames.length > 0
            ? requestedQueueNames
            : [...queueNames]
    ).filter((queueName) => registeredQueueNames.has(queueName));

    if (resolvedQueueNames.length === 0) {
        throw new Error("No queue workers are registered.");
    }

    const unavailableQueueNames = (requestedQueueNames ?? []).filter(
        (queueName) => !resolvedQueueNames.includes(queueName)
    );

    if (unavailableQueueNames.length > 0) {
        throw new Error(
            `No registered workers found for queues: ${unavailableQueueNames.join(", ")}.`
        );
    }

    return resolvedQueueNames;
}

export function startQueueWorkers(options: StartQueueWorkersOptions = {}) {
    const registry = createQueueJobRegistry();
    const targetQueueNames = resolveWorkerQueueNames(registry, options.queueNames);

    console.log(`[queue] Starting workers for queues: ${targetQueueNames.join(", ")}.`);

    return startRegisteredWorkers(registry, {
        queueNames: targetQueueNames,
    });
}
