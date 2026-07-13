/**
 * PM2 进程管理配置文件
 * 类似 Laravel Horizon，支持多进程队列 worker 管理
 *
 * 使用方式：
 *   pm2 start src/queues/queue.pm2.config.cjs --env production
 *   pm2 restart src/queues/queue.pm2.config.cjs
 *   pm2 delete src/queues/queue.pm2.config.cjs
 *   pm2 status
 *   pm2 logs
 *   pm2 monit
 *
 * 注意：PM2 会自动设置以下环境变量用于 Worker 识别：
 *   - name: 应用名称（如 queue-critical）
 *   - NODE_APP_INSTANCE: 实例编号（0, 1, 2...）
 *   - pm2_instance_name: 应用名称（显式设置）
 *   - pm2_instance_id: 实例编号（显式设置）
 */

const fs = require("fs");
const path = require("path");
const projectRoot = path.resolve(__dirname, "../..");
const queueConfig = require(path.join(projectRoot, "src/queues/config.json"));

function assertFlatQueueConfig(config) {
    if (config && typeof config === "object" && config.channels && !config.queues) {
        throw new Error(
            "[PM2] Queue config uses legacy channel model (channels). " +
                "Migrate to flat queues + --queues. See starter docs: guides/queues (channel→flat migration)."
        );
    }

    if (!config || typeof config !== "object" || !config.queues || typeof config.queues !== "object") {
        throw new Error(
            "[PM2] Queue config.json must provide flat queues. " +
                "Missing queues. See starter docs: guides/queues (channel→flat migration)."
        );
    }
}

assertFlatQueueConfig(queueConfig);

const pm2BaseConfig = queueConfig.pm2;
const schedulerConfig = queueConfig.scheduler;
const workerScript = path.resolve(projectRoot, pm2BaseConfig.script);
const schedulerScript = path.resolve(projectRoot, "scripts/start-queue-scheduler.mjs");

/**
 * 手动解析 .env 文件并返回环境变量对象
 * PM2 的 env_file 配置在某些情况下不生效，使用手动解析更可靠
 */
function parseEnvFile(filePath) {
    const envPath = path.resolve(projectRoot, filePath);

    if (!fs.existsSync(envPath)) {
        console.warn(`[PM2] .env file not found at ${envPath}`);
        return {};
    }

    const content = fs.readFileSync(envPath, "utf-8");
    const envVars = {};

    for (const line of content.split("\n")) {
        const trimmedLine = line.trim();

        // 跳过空行和注释
        if (!trimmedLine || trimmedLine.startsWith("#")) {
            continue;
        }

        // 解析 KEY=VALUE 格式
        const equalIndex = trimmedLine.indexOf("=");
        if (equalIndex === -1) {
            continue;
        }

        const key = trimmedLine.slice(0, equalIndex).trim();
        let value = trimmedLine.slice(equalIndex + 1).trim();

        // 移除引号（单引号或双引号）
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        envVars[key] = value;
    }

    return envVars;
}

// 加载 .env 文件中的环境变量
const envFileVars = parseEnvFile(".env");

function createPm2AppConfig(queueName, queueConfig) {
    return {
        name: `queue-${queueName}`,
        cwd: projectRoot,
        script: workerScript,
        args: `--queues=${queueName}`,
        instances: queueConfig.instances,
        exec_mode: pm2BaseConfig.exec_mode,
        autorestart: pm2BaseConfig.autorestart,
        watch: pm2BaseConfig.watch,
        max_memory_restart: queueConfig.maxMemory,
        env: {
            ...envFileVars,
            NODE_ENV: "production",
            pm2_instance_name: `queue-${queueName}`,
        },
        env_production: {
            ...envFileVars,
            NODE_ENV: "production",
            pm2_instance_name: `queue-${queueName}`,
        },
        env_development: {
            ...envFileVars,
            NODE_ENV: "development",
            pm2_instance_name: `queue-${queueName}`,
        },
        log_date_format: pm2BaseConfig.log_date_format,
        merge_logs: pm2BaseConfig.merge_logs,
        restart_delay: pm2BaseConfig.restart_delay,
        max_restarts: pm2BaseConfig.max_restarts,
        min_uptime: pm2BaseConfig.min_uptime,
        instance_var: pm2BaseConfig.instance_var,
    };
}

const apps = Object.entries(queueConfig.queues).map(([queueName, config]) =>
    createPm2AppConfig(queueName, config)
);

apps.push({
    name: "queue-scheduler",
    cwd: projectRoot,
    script: schedulerScript,
    instances: 1,
    exec_mode: "fork",
    autorestart: pm2BaseConfig.autorestart,
    watch: false,
    max_memory_restart: schedulerConfig.maxMemory,
    env: {
        ...envFileVars,
        NODE_ENV: "production",
        pm2_instance_name: "queue-scheduler",
    },
    env_production: {
        ...envFileVars,
        NODE_ENV: "production",
        pm2_instance_name: "queue-scheduler",
    },
    env_development: {
        ...envFileVars,
        NODE_ENV: "development",
        pm2_instance_name: "queue-scheduler",
    },
    log_date_format: pm2BaseConfig.log_date_format,
    merge_logs: pm2BaseConfig.merge_logs,
    restart_delay: pm2BaseConfig.restart_delay,
    max_restarts: pm2BaseConfig.max_restarts,
    min_uptime: pm2BaseConfig.min_uptime,
    instance_var: pm2BaseConfig.instance_var,
});

const includeQueueAll =
    process.env.PM2_INCLUDE_QUEUE_ALL === "true" || envFileVars.PM2_INCLUDE_QUEUE_ALL === "true";

if (includeQueueAll) {
    apps.push({
        name: "queue-all",
        cwd: projectRoot,
        script: workerScript,
        instances: 1,
        exec_mode: pm2BaseConfig.exec_mode,
        autorestart: pm2BaseConfig.autorestart,
        watch: pm2BaseConfig.watch,
        max_memory_restart: "500M",
        env: {
            ...envFileVars,
            NODE_ENV: "production",
            pm2_instance_name: "queue-all",
        },
        env_production: {
            ...envFileVars,
            NODE_ENV: "production",
            pm2_instance_name: "queue-all",
        },
        log_date_format: pm2BaseConfig.log_date_format,
        merge_logs: pm2BaseConfig.merge_logs,
        restart_delay: pm2BaseConfig.restart_delay,
        max_restarts: pm2BaseConfig.max_restarts,
        min_uptime: pm2BaseConfig.min_uptime,
        instance_var: pm2BaseConfig.instance_var,
    });
}

module.exports = {
    apps,
};
