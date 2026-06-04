import "../src/queues/config.ts";

import { startScheduler } from "@shanjing/astro-full-stack-starter/queue/core";
import { createQueueRedisConnection } from "../src/queues/config.ts";
import {
    getProcessId,
    getPm2InstanceId,
    getPm2InstanceName,
} from "@shanjing/astro-full-stack-starter/runtime/process";
import { configureQueueExceptionReporter } from "@shanjing/astro-full-stack-starter/queue";
import { createQueueKernel } from "../src/queues/kernel.ts";
import { initSentry, reportException } from "../src/observability/sentry.ts";

initSentry("queue-scheduler");
configureQueueExceptionReporter(reportException);

function getSchedulerUsageMessage() {
    return [
        "Usage:",
        "  pnpm queue:scheduler",
        "",
        "Environment:",
        "  REDIS_URL  Redis connection string for scheduler state and queue dispatch.",
    ].join("\n");
}

for (const argument of process.argv.slice(2)) {
    if (argument === "--help" || argument === "-h") {
        console.log(getSchedulerUsageMessage());
        process.exit(0);
    }

    if (argument === "--") {
        continue;
    }

    throw new Error(`Unknown argument "${argument}".\n\n${getSchedulerUsageMessage()}`);
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("[scheduler] Missing REDIS_URL. Example: REDIS_URL=redis://127.0.0.1:6379");
    process.exit(1);
}

if (process.env.NODE_APP_INSTANCE !== undefined && process.env.pm2_instance_id === undefined) {
    process.env.pm2_instance_id = process.env.NODE_APP_INSTANCE;
}

const pm2InstanceName = getPm2InstanceName() || "scheduler";
const pm2InstanceId = getPm2InstanceId() || "0";
const instanceId = `${pm2InstanceName}-${pm2InstanceId}-${getProcessId()}`;
const redis = createQueueRedisConnection("producer");
const registry = createQueueKernel();
const scheduler = startScheduler({
    instanceId,
    redis,
    registry,
});

async function shutdown(signal) {
    console.log(`[scheduler] Received ${signal}, shutting down...`);
    await scheduler.close();
    redis.disconnect(false);
    process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        void shutdown(signal);
    });
}
