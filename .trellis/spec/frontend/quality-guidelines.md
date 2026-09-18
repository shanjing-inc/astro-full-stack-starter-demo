# 质量规范

> 命令在仓库根目录执行。在主仓内调试同一 demo 时，等价写法是 `pnpm --filter deno-mysql-demo <script>`。

## 命令

| 命令                                       | 作用                                                           |
| ------------------------------------------ | -------------------------------------------------------------- |
| `pnpm install`                             | 安装依赖。私有 registry 由 `.npmrc` 指定                       |
| `pnpm dev`                                 | 先 `queue:sync`，再启动 Astro 开发服务器                       |
| `pnpm lint:check` / `pnpm lint:fix`        | ESLint 检查与修复                                              |
| `pnpm format:check` / `pnpm format:fix`    | Prettier 检查与修复                                            |
| `pnpm queue:sync`                          | 扫描 `src/queues/jobs/` 生成 `manifest.generated.ts`           |
| `pnpm test`                                | `queue:sync` + 单元测试 + 集成测试                             |
| `pnpm test:unit` / `pnpm test:integration` | 分层测试，都会先跑 `queue:sync`                                |
| `pnpm test:e2e`                            | Playwright e2e，配置为 `tests/config/playwright.e2e.config.ts` |
| `pnpm codegen`                             | 导出 GraphQL schema 并生成类型                                 |
| `pnpm check`                               | 完整检查，见下节                                               |
| `pnpm check:pre-commit`                    | 暂存文件格式检查，并按改动范围跑受影响检查                     |
| `pnpm build` / `pnpm build:release`        | 构建；`build:release` 产出 Deno 部署产物                       |
| `pnpm db:generate`                         | 由 `src/db/schemas.ts` 生成 Drizzle 迁移                       |
| `pnpm db:migration:bundle`                 | 生成独立部署迁移包到 `dist/migration/`                         |

`pnpm check` 依次执行：包管理器产物检查 → Deno 兼容检查 → `lint:check` → `format:check` → `test` → `codegen` → 生成物同步校验 → `astro-check`。

## 质量门禁

- `pnpm check` 是提交前唯一的完整检查入口。迭代中途只跑受影响用例，收尾时一次跑完。
- 生产逻辑、公共契约、GraphQL schema/resolver、UI 交互、队列或持久化改动，必须有测试、命令、页面或日志证据。
- 改 GraphQL schema 或 resolver 后必须跑 `pnpm codegen`，并确认 `src/graphql/generated/` 与代码同步。
- 改队列 job 后必须跑 `pnpm queue:sync`，否则测试使用的清单仍是旧内容。
- 迁移按 expand / deploy / contract 三步上线：更新前迁移只承载兼容变更（新增表、新增 nullable 字段、带默认值字段、索引），删除与收紧放到清理发布。部署前先 `./dist/migration/migrate.sh --dry-run`。
- 环境变量与密钥只放本机环境文件，不提交。

## TDD 证据

| 改动类型                   | 最少证据                                                 |
| -------------------------- | -------------------------------------------------------- |
| 生产逻辑、GraphQL resolver | 先写失败单测（RED），再实现到通过（GREEN）               |
| UI 交互                    | 组件单测或 e2e；附手工核对页面路径（如 `/test/graphql`） |
| 队列、迁移、部署脚本       | 单测，或改动前后命令输出对比                             |
| 纯文档与 spec              | 文件 diff 与 `git diff --check`                          |

记录证据时写明命令与结果，不只写结论。RED 与 GREEN 都要有可复现的命令。
