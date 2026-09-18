# Hook 规范

> 当前自定义 hook 数量较少，主要模式是 GraphQL 请求 hook 和响应式媒体 query hook。

## GraphQL 请求 Hook

dashboard 页面统一用 starter 包的 `useDashboardQuery<TData, TVariables>()` 读取 GraphQL server state，从 `@shanjing/astro-full-stack-starter/dashboard/client` 导入。

- 返回 `{ data, error, loading, refetch }`。
- `refetch()` 通过递增内部 `requestVersion` 触发重新请求。
- `variables` 用 `JSON.stringify(variables ?? {})` 生成 key，再 `useMemo` 保持引用稳定。
- 组件卸载后丢弃异步返回。
- 请求错误转成字符串，默认文案是 `"GraphQL request failed."`。

页面用法（代码证据 `src/dashboards/admin/pages/shop-list.tsx`）：

```ts
const { data, error, loading, refetch } = useDashboardQuery<
    ListAdminShopsQuery,
    ListAdminShopsQueryVariables
>(LIST_ADMIN_SHOPS, variables);
```

查询常量用 `gql`（从 `@apollo/client/core` 导入）包装，放在页面文件里；operation 类型从 `@/graphql/generated/{admin,member}-types` 取。

## 命令式请求

事件回调里的一次性请求用同一个出口 `executeDashboardGraphQL<Data, Variables>(document, variables)`，它返回 Promise：

```ts
await executeDashboardGraphQL<UpdateAdminShopMutation, UpdateAdminShopMutationVariables>(
    UPDATE_ADMIN_SHOP,
    { set: { name, slug, status }, where: { id: { eq: shopId } } }
);
refetch();
```

代码证据：`src/dashboards/admin/pages/shop-list.tsx`。

## GraphQL 客户端

GraphQL client 由 starter 包提供，不要在本仓另建 client：

- 基于 Apollo `BaseBatchHttpLink`，batch 配置为 `batchInterval: 5`、`batchMax: 10`。
- `credentials` 是 `"same-origin"`，请求 header 与 `fetchOptions.cache` 都禁用缓存。
- 运行时可用 `configureDashboardGraphQL()` 覆盖 uri。
- GraphQL error 只读取标准 `message`，裁剪空白后用换行拼接；`message` 缺失或只有空白时用固定 fallback `"GraphQL request failed."`。
- 响应里即使带 `extensions.originalError`，用户可见错误仍用标准 `message`。

并发请求会合并成一次 fetch，测试见 `tests/unit/dashboard/graphql/request.test.ts`。

## 响应式 Hook

通用 hook 放在 `src/hooks/`。当前 `src/hooks/use-mobile.ts` 用 React state 保存 `boolean | undefined`，并在 effect 中监听媒体查询。

## 使用边界

- 页面级数据请求走 `useDashboardQuery`，不要自己写 `fetch` + `useEffect`。
- 只有事件回调里的写操作或一次性请求才用 `executeDashboardGraphQL`。
- 表单筛选状态放 URL search params，不放进全局 store。
