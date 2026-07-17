# Deno MySQL demo 测试目录

## 目录职责

```text
tests/
├── config/                  # Vitest 与 Playwright 配置
├── shared/                  # 通用 Vitest setup 与 helper
├── unit/                    # 纯函数、parser、mocked service、isolated component
├── integration/             # DOM、SQLite、migration、queue/runtime 协作
│   └── fixtures/sqlite/     # Integration 专属 SQLite fixture
└── e2e/
    └── specs/               # Playwright 业务能力 specs
```

E2E 后续扩展目录采用 `fixtures/`、`helpers/`、`pages/`、`runtime/`。出现真实实现时创建对应目录。

## 命名

- Unit 与 Integration：`*.test.ts` 或 `*.test.tsx`。
- E2E：`*.e2e.spec.ts`。
- 测试按业务域组织，例如 `graphql/`、`db/`、`queues/`、`dashboard/`。

## 命令

```bash
pnpm --filter deno-mysql-demo test:unit
pnpm --filter deno-mysql-demo test:integration
pnpm --filter deno-mysql-demo test
pnpm --filter deno-mysql-demo test:coverage
pnpm --filter deno-mysql-demo test:e2e
pnpm --filter deno-mysql-demo test:unit tests/unit/runtime/utils.test.ts
pnpm --filter deno-mysql-demo test:e2e --list
```

倒数第二条命令演示单文件聚焦运行，测试路径直接跟在 script 后面。最后一条命令只执行 Playwright 用例发现。

Unit 命令提供快速反馈。Integration 命令生成 SQLite migration。Coverage 命令通过单次 Vitest 运行聚合 Unit 与 Integration。
