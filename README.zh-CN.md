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
pnpm --filter deno-mysql-demo check:pre-commit
pnpm --filter deno-mysql-demo build
pnpm --filter deno-mysql-demo db:migration:bundle
```

根级质量检查也会包含这个 demo：

```bash
pnpm check
```

这个 demo 也支持独立仓库场景的提交前检查。安装依赖后，`prepare` 会初始化 Husky；提交时 `pnpm check:pre-commit` 会先检查暂存文件格式。纯文档变更只检查格式，代码或配置变更会继续运行本 demo 的 `pnpm check`。

## 浏览器测试页

启动开发服务器后，可以打开 `src/pages/test/*.astro` 对应页面，在浏览器里验证 demo 功能：

- `/test/cache`：通过 Redis cache adapter 写入短 TTL 探针数据，并通过锁动作链接展示 TTL 读取和锁行为。
- `/test/graphql`：向 member 和 admin GraphQL endpoint 发送预设请求或自定义请求。
- `/test/database`：检查 MySQL 原生连接、Drizzle provider，并预览 `shop` 表。
- `/test/queue`：按队列派发 BullMQ demo job，展示当前请求结果，并显示 Redis 记录的最近执行历史。
- `/test/sse`：连接公开 SSE endpoint，展示收到的 server-sent events。
- `/test/websocket`：测试 public、member 和 admin WebSocket endpoint，覆盖 ping、echo、自定义消息和服务端主动推送。

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

### 数据库迁移包

独立 demo 仓库上线时，CI 可以生成数据库迁移包：

```bash
pnpm db:migration:bundle
```

产物位于 `dist/migration/`，包含：

- `drizzle/**/migration.sql`
- `migrate.mjs`
- `migrate.sh`
- `deno.lock`
- `README.md`

客户服务器或部署机执行预检查：

```bash
DATABASE_URL="mysql://user:password@host:3306/database" ./dist/migration/migrate.sh --dry-run
```

`--dry-run` 会连接数据库，读取 `__drizzle_migrations`，打印目标库摘要、pending migration 列表和每个 migration 的 statement 数量，并跳过 SQL 执行。

确认后执行迁移：

```bash
DATABASE_URL="mysql://user:password@host:3306/database" ./dist/migration/migrate.sh
```

runner 会按 `drizzle/` 目录名升序执行 SQL，并写入 Drizzle MySQL migrator 兼容的 `__drizzle_migrations` 表。日志只输出 host、port、database 和遮蔽后的 username。

### 上线顺序

推荐使用 expand / deploy / contract：

1. 先生成并交付 `dist/migration/`。
2. 在业务 Docker 更新前运行 `./migrate.sh --dry-run`。
3. 通过后运行 `./migrate.sh`，只执行兼容 schema 变更。
4. 滚动更新多台服务器上的业务 Docker。
5. 等旧版本回退窗口结束后，在后续清理发布中处理 contract 类变更。

更新前迁移只承载兼容变更：

- 新增表。
- 新增 nullable 字段。
- 新增带默认值字段。
- 新增索引。
- 保留旧字段、旧表和旧约束语义。

清理发布承载 contract 类变更：

- 删除字段或表。
- 字段重命名后的旧字段清理。
- 收紧 nullable。
- 改变字段业务含义。
- 删除旧约束语义。

多台服务器滚动更新期间，旧版和新版业务镜像共用同一个兼容 schema。镜像回退依赖这条兼容规则：数据库保持 expand 状态时，业务镜像可以回退到旧版本。MySQL DDL 存在隐式提交语义，迁移失败后的恢复依赖发布前备份、迁移拆分和人工确认。
