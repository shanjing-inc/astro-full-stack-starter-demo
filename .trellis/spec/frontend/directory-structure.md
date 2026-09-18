# 目录结构规范

> 路径相对仓库根目录。判断归属时以本表为准，不要新建平行目录。

## 仓库布局

| 路径                                   | 归属                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/pages/`                           | Astro 页面路由。公开页、`member/`、admin 占位入口都按路由铺开                                                    |
| `src/pages/api/`                       | API route。内部诊断与健康检查在 `api/rest/internal/` 与 `api/internal/`                                          |
| `src/pages/test/`                      | 人工验证页面：cache、graphql、database、queue、sse、websocket                                                    |
| `src/dashboards/`                      | React SPA dashboard 应用，按 dashboard id 分目录（`admin/`、`member/`）                                          |
| `src/components/ui/`                   | shadcn/ui 组件                                                                                                   |
| `src/components/<dashboard-id>/`       | dashboard 业务组件                                                                                               |
| `src/components/public/`               | 公开页面组件                                                                                                     |
| `src/components/admin/`                | admin 侧复用组件                                                                                                 |
| `src/graphql/`                         | `builder.ts`、`context.ts`、插件，以及 `queries/`、`mutations/`、`types/`、`schemas/`、`adapters/`、`generated/` |
| `src/db/`                              | Drizzle `client.ts`、`schemas.ts`、`relations.ts`、`index.ts`                                                    |
| `src/queues/`                          | `kernel.ts`、`runtime.ts`、`config.ts`、`start-workers.ts` 与 `jobs/`                                            |
| `src/sse/`、`src/websocket/`           | 事件通道与 adapter，websocket 功能按 `features/` 分目录                                                          |
| `src/lib/`                             | 认证（`auth.ts`）与共享工具                                                                                      |
| `src/observability/`                   | 日志与观测                                                                                                       |
| `src/middleware/`、`src/middleware.ts` | Astro middleware 与鉴权入口                                                                                      |
| `src/layouts/`、`src/styles/`          | 布局与样式                                                                                                       |
| `src/hooks/`、`src/stores/`            | React hook 与 Nanostores 状态                                                                                    |
| `tests/`                               | `unit/`、`integration/`、`e2e/`、`config/`、`shared/`                                                            |
| `scripts/`                             | 构建、检查、迁移打包、队列启动等脚本                                                                             |
| `drizzle/`                             | 迁移 SQL 与 Drizzle 元数据                                                                                       |
| `docker/`                              | Deno 运行镜像与 compose 配置                                                                                     |
| `dist/`                                | 构建产物、迁移包产物，不提交                                                                                     |

## 归属判断

- 新页面放 `src/pages/`；内部诊断接口放 `src/pages/api/rest/internal/`。
- 新 dashboard 放 `src/dashboards/<dashboard-id>/`，入口路径由 `astro.config.mjs` 的 `dashboard.instances.<id>.path` 控制，示例占位路径是 `/replace-with-your-admin-path`。
- 业务 GraphQL 字段放 `src/graphql/{queries,mutations,types}/`，外部服务适配放 `src/graphql/adapters/`。
- 队列 job 放 `src/queues/jobs/*.job.ts`，文件名决定清单条目。
- 数据库结构改动先改 `src/db/schemas.ts`，再用 `pnpm db:generate` 生成迁移。
- 测试 fixture 只服务测试，不进生产 schema。

## 生成物

| 生成物                                  | 生成命令                                 | 说明                                                        |
| --------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `src/graphql/generated/`                | `pnpm codegen`                           | GraphQL 类型与 schema 导出；`pnpm check` 会校验其与代码同步 |
| `src/queues/jobs/manifest.generated.ts` | `pnpm queue:sync`                        | 队列清单；`test`、`dev`、`build` 都会先跑一次               |
| `dist/`                                 | `pnpm build`、`pnpm db:migration:bundle` | 构建产物与迁移包，不提交                                    |
