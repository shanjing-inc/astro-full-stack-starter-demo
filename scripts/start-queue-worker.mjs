import "../src/queues/config.ts";

import { parseQueueNames } from "@shanjing/astro-full-stack-starter/queue/core";
import { startQueueWorkers } from "../src/queues/start-workers.ts";
import { initSentry } from "../src/observability/sentry.ts";
import { configureQueueExceptionReporter } from "@shanjing/astro-full-stack-starter/queue";
import { reportException } from "../src/observability/sentry.ts";

initSentry("queue-worker");
configureQueueExceptionReporter(reportException);

function getWorkerUsageMessage() {
    return [
        "Usage:",
        "  pnpm queue:worker",
        '  pnpm queue:worker --queues="critical,default"',
        "",
        "Options:",
        "  --queues=<list>  Start only the specified queues, separated by commas.",
    ].join("\n");
}

function parseWorkerStartupOptions(argv) {
    const rawQueueValues = [];
    let hasQueuesFlag = false;

    for (const argument of argv) {
        if (argument === "--help" || argument === "-h") {
            console.log(getWorkerUsageMessage());
            process.exit(0);
        }

        if (argument === "--") {
            continue;
        }

        if (argument.startsWith("--queues=")) {
            hasQueuesFlag = true;
            rawQueueValues.push(argument.slice("--queues=".length));
            continue;
        }

        throw new Error(`Unknown argument "${argument}".\n\n${getWorkerUsageMessage()}`);
    }

    if (!hasQueuesFlag) {
        return {};
    }

    const { queueNames, invalidQueueNames } = parseQueueNames(rawQueueValues);

    if (invalidQueueNames.length > 0) {
        throw new Error(
            `Unsupported queues: ${invalidQueueNames.join(", ")}.\n\n${getWorkerUsageMessage()}`
        );
    }

    if (queueNames.length === 0) {
        throw new Error(`No valid queues were provided.\n\n${getWorkerUsageMessage()}`);
    }

    return {
        queueNames,
    };
}

let workerStartupOptions;

try {
    workerStartupOptions = parseWorkerStartupOptions(process.argv.slice(2));
} catch (error) {
    console.error(
        `[queue] ${error instanceof Error ? error.message : "Failed to parse worker startup options."}`
    );
    process.exit(1);
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("[queue] Missing REDIS_URL. Example: REDIS_URL=redis://127.0.0.1:6379");
    process.exit(1);
}

// PM2 会自动设置 NODE_APP_INSTANCE，将其同步到 pm2_instance_id
if (process.env.NODE_APP_INSTANCE !== undefined && process.env.pm2_instance_id === undefined) {
    process.env.pm2_instance_id = process.env.NODE_APP_INSTANCE;
}

const workers = startQueueWorkers(workerStartupOptions);

async function shutdown(signal) {
    console.log(`[queue] Received ${signal}, shutting down workers...`);

    await Promise.all(workers.map((worker) => worker.close()));
    process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        void shutdown(signal);
    });
}
