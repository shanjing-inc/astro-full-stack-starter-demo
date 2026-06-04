# Deno MySQL Demo

[English](./README.md) | [中文](./README.zh-CN.md)

这个 demo 展示 Astro full-stack starter 在 Deno 运行时下配合 MySQL 的使用方式。它适合用来验证 Deno 部署路径、数据库工作流，以及服务端队列相关逻辑。

## 技术栈

- Astro 全栈应用结构
- Deno 运行时目标
- MySQL 数据库访问
- 通过生成清单发现队列任务
- 覆盖服务端工作流的单元测试和集成测试

## 快速开始

在 workspace 根目录执行：

```bash
pnpm install
pnpm --filter deno-mysql-demo dev
```

查看这个 demo 暴露的全部脚本：

```bash
pnpm --filter deno-mysql-demo run
```

## 常用命令

```bash
pnpm --filter deno-mysql-demo dev
pnpm --filter deno-mysql-demo test
pnpm --filter deno-mysql-demo check
pnpm --filter deno-mysql-demo build
```

根级质量检查也会包含这个 demo：

```bash
pnpm check
```

## 浏览器测试页

启动开发服务器后，可以打开 `src/pages/test/*.astro` 对应页面，在浏览器里验证 demo 功能：

- `/test/cache`：通过 Redis cache adapter 写入短 TTL 探针数据，并通过锁动作链接展示 TTL 读取和锁行为。
- `/test/graphql`：向 member 和 super-admin GraphQL endpoint 发送预设请求或自定义请求。
- `/test/mysql`：检查 MySQL 原生连接、Drizzle provider，并预览 `shop` 表。
- `/test/queue`：按队列派发 BullMQ demo job，展示当前请求结果，并显示 Redis 记录的最近执行历史。
- `/test/sse`：连接公开 SSE endpoint，展示收到的 server-sent events。
- `/test/websocket`：测试 public、member 和 super-admin WebSocket endpoint，覆盖 ping、echo、自定义消息和服务端主动推送。

这些页面是可运行的集成示例，适合本地开发时做人工检查，也适合用来理解 demo 如何把 starter 基础能力接入 Deno 运行时。

## 队列清单

这个 demo 包含队列清单生成器。生成器会扫描队列任务模块，并写入队列运行时和队列测试使用的生成清单。

独立测试命令会负责这个前置步骤，所以队列相关验证通常使用：

```bash
pnpm --filter deno-mysql-demo test
```

## 环境变量

根据当前 workspace 的项目约定创建 demo 环境文件，然后填入应用需要的 MySQL 连接配置。

常见配置包括：

- 数据库主机
- 数据库端口
- 数据库用户
- 数据库密码
- 数据库名称

开发密钥使用本机专属值。

## 部署说明

当你需要验证 Deno 运行时和 MySQL 后端组合时，可以使用这个 demo。运行时专属配置应保留在这个 demo 内，让共享 starter package 保持可复用。
