# Cloudflare D1 Demo

[English](./README.md) | [中文](./README.zh-CN.md)

这个 demo 展示 Astro full-stack starter 在 Cloudflare 运行时下配合 D1 数据库的使用方式。它适合用来验证边缘部署、本地开发、测试覆盖和 Cloudflare 专属构建检查。

## 技术栈

- Astro 全栈应用结构
- Cloudflare 运行时目标
- Cloudflare D1 数据库
- 基于 Wrangler 的本地开发和部署工作流
- 覆盖应用行为的单元测试

## 快速开始

在 workspace 根目录执行：

```bash
pnpm install
pnpm --filter cloudflare-d1-demo dev
```

查看这个 demo 暴露的全部脚本：

```bash
pnpm --filter cloudflare-d1-demo run
```

## 常用命令

```bash
pnpm --filter cloudflare-d1-demo dev
pnpm --filter cloudflare-d1-demo test
pnpm --filter cloudflare-d1-demo check
pnpm --filter cloudflare-d1-demo build
```

根级质量检查也会包含这个 demo：

```bash
pnpm check
```

## 浏览器测试页

启动开发服务器后，可以打开 `src/pages/test/*.astro` 对应页面，在浏览器里验证 demo 功能：

- `/test/cache`：通过统一 cache contract 验证 Workers KV、Cache API 和 Durable Objects，并通过锁动作链接展示锁行为。
- `/test/graphql`：向由 D1 provider 支撑的 member 和 admin GraphQL endpoint 发送预设请求或自定义请求。
- `/test/database`：检查 D1 binding、Drizzle D1 provider，并预览 `shop` 表。
- `/test/queue`：按逻辑队列派发 Cloudflare Queues demo job，展示当前请求结果，并显示 D1 记录的执行历史。
- `/test/sse`：连接公开 SSE endpoint，展示收到的 server-sent events。
- `/test/websocket`：测试 public、member 和 admin WebSocket endpoint，覆盖 ping、echo、自定义消息和服务端主动推送。

这些页面是可运行的集成示例，适合本地开发时做人工检查，也适合用来理解 demo 如何把 starter 基础能力接入 Cloudflare 运行时。

## Cloudflare 配置

这个 demo 用于 Cloudflare 专属运行时检查和 D1 集成工作。Cloudflare 账号、数据库和部署配置应保留在项目使用的 demo 级配置文件中。

本地开发时，需要确认 Cloudflare 配置里的 D1 database binding 和应用期望的绑定名称一致。

## 环境变量

根据当前 workspace 的项目约定创建 demo 环境文件，然后填入应用需要的 Cloudflare 和应用配置。

常见配置包括：

- Cloudflare 账号或部署设置
- D1 数据库绑定和标识符
- 服务端代码使用的应用密钥

开发密钥使用本机专属值。

## 部署说明

当你需要验证 Cloudflare 运行时和 D1 组合时，可以使用这个 demo。部署前运行 demo 级质量检查，让测试、格式化和构建期 Cloudflare 假设保持一致。
