# GraphQL DataLoader 规范

> 字段级批处理与 request cache 的契约。基础端点与字段注册见 [GraphQL 规范](./graphql-guidelines.md)。

## 适用范围

- `src/graphql/adapters/`、`src/graphql/context.ts`。
- 使用 `t.loadable()` / `t.loadableList()` 的 type 文件，例如 `src/graphql/types/product.ts`。
- 新增聚合字段、批量查询字段、loader key，或调整 request cache 生命周期时。

依赖来自 starter 包：`@pothos/plugin-dataloader` 与 `dataloader` 已由 starter 的 Pothos builder 注册，字段级 API 直接可用，不需要在本仓重复注册插件。

## Request cache

从 `@shanjing/astro-full-stack-starter/graphql/cache/request` 显式导入 factory。adapter 顶层为每个 endpoint 创建一个 factory：

```ts
import { createGraphQLRequestContextCache } from "@shanjing/astro-full-stack-starter/graphql/cache/request";

const getRequestContextCache = createGraphQLRequestContextCache();

export const adapter = {
    context: ({ request }) => createGraphQLContext(request, getRequestContextCache(request)),
};
```

context 展开 factory 返回值：

```ts
return {
    ...cache,
    db,
    request,
};
```

- 同一个 `Request` 映射到同一个 cache 结果，Yoga HTTP batch 中的多个 operation 共享 DataLoader identity。
- 不同 `Request`、`Request.clone()`、不同 endpoint 的 factory 各自独立。
- `Request` 只作为 adapter 内 `WeakMap` 的弱键，cache 生命周期跟着 HTTP 请求走。

## 字段级批处理

- 标准 Drizzle relation 用 `t.relation()`；聚合或自定义批量字段用 `t.loadable()` / `t.loadableList()`。
- `load` 逻辑放在使用字段附近，包含实体专属 SQL、业务过滤和结果映射。
- `resolve` 读取的 key 字段要在所属 `drizzleObject` 的 `select.columns` 里显式声明，保证客户端只选 loadable 字段时仍拿得到 key。
- 返回 Drizzle 对象的 `t.drizzleField()` resolver 必须调用插件传入的 `query()` helper，并把返回配置交给 `findFirst()` / `findMany()`，selection 才会进入真实查询。
- 空 key 数组直接返回空数组，避免生成空 `IN` 条件。
- 返回数组与输入 key 数组等长、同序；缺失结果按字段契约映射成 `0`、`null` 或空数组。
- 对象或复合 key 用 `loaderOptions.cacheKeyFn` 提供稳定缓存键。
- `count` 这类方言相关结果在返回 GraphQL scalar 前转换成对应 JavaScript 类型。

现有示例：`src/graphql/types/product.ts` 的 `orderCount` 用 `t.loadable()` + `COUNT(order.id)`、`GROUP BY product_id`，结果先写进 `Map`，再按输入 product id 顺序返回，缺失商品返回 `0`。

## 验证

- 字段测试覆盖同 tick 合批、重复 key 命中 cache、输入顺序、缺失结果和空结果。
- adapter 与 context 测试确认同一 `Request` 只执行一次 loader，另一个 `Request` 结果隔离。
- 改 GraphQL schema 后跑 `pnpm codegen`，再跑 `pnpm test` 与 `pnpm check`。

参考现有测试：`tests/unit/graphql/adapters-context-cache.test.ts`、`tests/unit/graphql/context.test.ts`。
