# 状态管理规范

> 状态分四类：URL state、server state、local UI state、Nanostores persistent state。

## URL 状态

列表页的筛选和分页用 React Router 的 `useSearchParams()`。

当前约定：

- 从 `searchParams` 派生 filters、page、pageSize。
- 分页解析用 starter 包的 `parsePageParam()` 与 `parsePageSizeParam()`（`@shanjing/astro-full-stack-starter/dashboard/client`）。
- 筛选提交后把 `page` 设为 `"1"`。
- 清空筛选时删除对应 query key，同样把 `page` 设为 `"1"`。
- `searchParamsKey = searchParams.toString()` 传给 `useResettableFilterForm(searchParamsKey)`，用返回的 `formKey`、`formRef` 把 uncontrolled 表单字段和 URL、Reset 动作对齐。

代码证据：`src/dashboards/admin/pages/shop-list.tsx`、`src/dashboards/admin/pages/order-list.tsx`、`src/dashboards/admin/pages/product-list.tsx`。

## React Router 契约

SPA 路由 API 统一从 `react-router` 导入，不要用 `react-router-dom`：

```ts
import {
    BrowserRouter,
    Link,
    Navigate,
    NavLink,
    Outlet,
    Route,
    Routes,
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router";
```

- 版本线是 `react-router@^8`，dashboard SPA 入口是 `src/dashboards/<id>/app.tsx` 与 `src/dashboards/<id>/routes.tsx`。
- 继续使用 declarative router：`BrowserRouter` 包住 `Routes` / `Route` / `Navigate`，fallback route 跳回 basePath。
- 列表页 URL state 继续用 `useSearchParams()`。
- 出现 `from "react-router-dom"` 就是错误，改回 `react-router`；依赖或 lockfile 里出现 `react-router-dom` 也要清掉。

校验：

```bash
rg -n 'react-router-dom' package.json pnpm-lock.yaml src -g '*.{json,yaml,ts,tsx}'
```

期望无输出。

## 服务端状态

dashboard GraphQL server state 由 `useDashboardQuery` 管理，页面按 `loading`、`error`、`data` 渲染，并用返回的 `refetch()` 手动刷新。写操作走 `executeDashboardGraphQL`，成功后 `refetch()`。

代码证据：`src/dashboards/admin/pages/dashboard.tsx`、`src/dashboards/admin/pages/shop-list.tsx`。

## 本地 UI 状态

页面内短生命周期状态用 React `useState()`：弹窗开关、`pendingXxxId`、`actionError`、临时 notice 都属于这一类。

代码证据：`src/dashboards/admin/pages/shop-list.tsx` 的 `selectedShop`、`pendingShopId`、`actionError`。

## 持久化状态

跨刷新保留的状态用 Nanostores `persistentAtom()`，放在 `src/stores/`：

- `src/stores/counter.ts` 使用 storage key `demo:counter`。
- `src/stores/site-theme.ts` 使用 storage key `site:theme`。

React 组件通过 `@nanostores/react` 的 `useStore()` 读取。代码证据：`src/components/public/site-theme-toggle.tsx`。

```ts
export const $siteTheme = persistentAtom<SiteTheme>(siteThemeStorageKey, "light", {
    encode: (theme) => theme,
    decode: (theme) => (theme === "dark" ? "dark" : "light"),
});
```

## Dashboard 首屏偏好

主题与字号偏好按 dashboard 隔离，key 规则由 starter 包的 dashboard shell 与 `DashboardApp` 负责：

- 主题 storage key：`dashboard:<dashboardId>:theme`。
- 字号 cookie：`dashboard-<dashboardId>-font-size`。

本仓只需要在 `astro.config.mjs` 的 `dashboard.instances.<id>` 里声明 `title`、`path`、`app`、`graphqlEndpoint`，不要自己拼偏好 key，也不要让多个 dashboard 共用同一个 key。

## 持久化状态与 island hydration

React island 渲染 `persistentAtom()` 时，SSR 与 hydration 首帧必须一致，用 `useSyncExternalStore()` 提供 `getServerSnapshot`：

```ts
function useHydrationStableCounter() {
    return useSyncExternalStore(
        (listener) => $counter.listen(listener),
        () => $counter.get(),
        () => 0
    );
}
```

- 反例：直接 `const counter = useStore($counter)` 渲染文本 —— 浏览器首帧可能读到 `localStorage`，触发 hydration mismatch。
- 反例：在 `useEffect()` 里 `setState(true)` 标记 mounted —— 触发 `react-hooks/set-state-in-effect` lint。
- 持久化值在 hydration 完成后由 store 订阅刷新到页面。

代码证据：`src/components/public/counter-island.tsx`。

## 状态放置建议

- URL 可分享、可刷新恢复的筛选与分页状态放 search params。
- GraphQL 数据留在 `useDashboardQuery` 的 server state 里。
- 按钮 pending、错误提示、临时 notice 放页面局部 `useState()`。
- 跨刷新保留的主题、演示计数放 `src/stores/` 的 `persistentAtom()`。
