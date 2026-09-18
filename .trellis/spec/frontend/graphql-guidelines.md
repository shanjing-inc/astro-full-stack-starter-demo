# GraphQL 规范

> 路径相对仓库根目录。字段级批处理见 [GraphQL DataLoader 规范](./graphql-dataloader.md)。

## 端点

| 端点名   | path                  | adapter                          | schema                          | 面向                                           |
| -------- | --------------------- | -------------------------------- | ------------------------------- | ---------------------------------------------- |
| `member` | `/api/graphql/member` | `src/graphql/adapters/member.ts` | `src/graphql/schemas/member.ts` | member dashboard 与公开查询                    |
| `admin`  | `/api/graphql/admin`  | `src/graphql/adapters/admin.ts`  | `src/graphql/schemas/admin.ts`  | admin dashboard，含写操作与 dashboard 管理字段 |

契约：

- 端点在 `astro.config.mjs` 的 `astroFullstackStarter({ graphql: { endpoints: { ... } } })` 里声明，route 由 starter integration 注入。
- 本仓不保留 `src/pages/api/graphql/**` 文件路由，避免和注入的 route 重复。
- 端点名用 camelCase；`path` 与 `adapter` 必须是非空字符串，adapter 路径相对项目根目录，例如 `./src/graphql/adapters/admin.ts`。
- 两个端点各自一份 schema：member 只有查询和 currentUser 字段，写操作只在 admin。权限差异靠 schema 隔离，不在 resolver 里额外判角色。
- adapter 统一导出 `adapter`，包含 `schema`、`context`（`createGraphQLContext`）、`batching.limit`、`graphiql` 和 Sentry 插件。
- 人工验证：起开发服务器后打开 `/test/graphql`，按端点发预设或自定义请求。

## 命名与结构规则

Query：

- 名字用 camelCase，简洁、有描述性，避免保留字和特殊字符。
- 单条查询以 `get` 开头，列表查询以 `list` 开头，例如 `listProducts(where: ProductFilters, orderBy: ProductOrderBy, limit: Int, offset: Int): [ProductItem!]`。
- 用 `builder.queryField` 逐字段定义，不要用 `builder.queryFields` 一次性定义，便于同一字段被多个 endpoint 复用。

Mutation：

- 名字用 camelCase，按语义以 `create`、`update`、`delete` 开头。
- 用 `set` 承载更新负载，用 `where` 承载定位条件，例如 `updateAccount(set: UpdateInput!, where: FilterInput): [Result!]!`。
- 用 `builder.mutationField` 逐字段定义，不要用 `builder.mutationFields`。

字段与类型：

- 字段名用 camelCase，简洁、有描述性，避免保留字和特殊字符。
- query、mutation 的字段列表按字母顺序排序；type 的字段列表按数据库字段顺序排序。
- 类型命名把表名转成 PascalCase 加 `Item` 后缀，例如 `user` → `UserItem`、`account` → `AccountItem`。
- 参数不超过 5 个且逻辑简单时（如 `delete(id: ID!)`）可以平铺 Args；超过 5 个或逻辑复杂时必须用 Input Object。
- `set` 只放业务允许修改的字段，剔除 `id`、`createdAt` 等只读字段；`where` 放唯一标识和扩展筛选位，支持批量操作。
- query 与 mutation 复用同一个 Filter 输入类型，保证筛选语义一致。

目录：

- 实现放 `src/graphql/`，并按表名拆分文件，不要全塞进 `index.ts`：查询放 `src/graphql/queries/`，写操作放 `src/graphql/mutations/`，类型放 `src/graphql/types/`（types 只按表分文件，不再按类型细分）。

Builder 与数据层：

- Pothos 用法：`builder.drizzleObject()` 定义基于 Drizzle 表的对象类型，`builder.inputType()` 定义输入类型，`builder.objectRef().implement()` 定义自定义对象类型，`builder.queryType()` / `builder.mutationType()` 定义根类型，`t.drizzleField()` 定义返回 Drizzle 对象的字段。
- 数据库 relations 在 `src/db/relations.ts` 用 `defineRelations` 定义。
- 输入校验用 drizzle-zod（`createInsertSchema` / `createUpdateSchema`），现有写法见 `src/graphql/types/order.ts`、`src/graphql/types/product.ts`、`src/graphql/types/shop.ts`。
- 需要避免 N+1 时使用字段级 loader，契约见 [GraphQL DataLoader 规范](./graphql-dataloader.md)。

前端调用：

- 用 `gql` 包装查询，查询常量放组件所在的页面文件内，operation 类型从 `src/graphql/generated/{admin,member}-types.ts` 取，不要手写 operation 类型。
- 除明确要求缓存外，查询都禁用缓存。

## 新增一个接口

以为 admin 端点加一个写操作接口为例：

1. 选端点：只给 member 客户端用的字段放 member schema；写操作和后台字段放 admin。
2. 在 `src/graphql/types/<domain>.ts` 注册 Pothos 类型与 Input，zod 校验和 parse/build helper 也写在这里。
3. 在 `src/graphql/queries/<domain>.ts` 或 `src/graphql/mutations/<domain>.ts` 新增 `registerXxx` 函数，用 `builder.queryField` / `builder.mutationField` 配 `t.drizzleField` 实现字段。
4. 在 `src/graphql/schemas/admin.ts` 或 `src/graphql/schemas/member.ts` 里调用这个 register 函数；没有注册进 schema 的字段不会出现在端点上。
5. 需要会话时用 `context.session` / `context.sessionUser`；跨表约束在写入前校验，写法参考 `src/graphql/mutations/order.ts` 的 owner 校验。
6. 跑 `pnpm codegen`：重新导出 `src/graphql/generated/{admin,member}-schema.graphql`，并按 dashboard 文档生成 `src/graphql/generated/{admin,member}-types.ts`。前端查询写在 `src/dashboards/<id>/**` 里才会被 codegen 收集。
7. 补测试：解析与注册单测放 `tests/unit/graphql/`；端点与 adapter 契约参考 `tests/unit/astro-fullstack-starter/integration.test.ts`；页面数据流放 `tests/integration/`。
8. 提交前跑 `pnpm check`，其中包含 generated 与代码的同步校验。

## 约定

- 抛错遵循项目规则：GraphQL resolver 与 helper 用 `GraphQLError`，Astro 页面与 API route 用 `AstroError`；错误包装与 `originalError` 行为见 `tests/unit/graphql/original-error-guard.test.ts`。
- 字段级批处理与 request cache 直接用 starter 能力（`@shanjing/astro-full-stack-starter/graphql/cache/request`），不在本仓自建缓存。
- `src/graphql/generated/` 是生成物，不手工编辑。
