# 组件规范

> 组件以 shadcn/ui 基础组件、starter 包的 dashboard 组件和本地业务组件组合为主。

## 基础组件

本地基础组件放在 `src/components/ui/`，沿用 shadcn/ui 风格：

- 用 `React.ComponentProps<"...">` 继承原生 props。
- 用 `class-variance-authority` 定义 variant 与 size。
- 用 `cn()` 合并 className。
- 支持 Radix `Slot.Root` 的组件通过 `asChild` 切换渲染元素。

代码证据：`src/components/ui/button.tsx`、`src/components/ui/sidebar.tsx`。

## Dashboard 共享组件

`DataTable`、`TablePagination`、`StatusBadge`、`DateTimeCell`、`Select`、`Sheet`、`parsePageParam`、`parsePageSizeParam`、`useDashboardQuery`、`useResettableFilterForm`、`executeDashboardGraphQL`、`DataTableColumn` 都由 starter 包从 `@shanjing/astro-full-stack-starter/dashboard/client` 导出。

- 业务页面直接导入使用，不要在本仓 fork 一份。
- 需要跨项目复用的新基础组件，先加到 starter 包再使用（本仓只放本 demo 专属组件）。
- 代码证据：`src/dashboards/admin/pages/shop-list.tsx` 的导入列表。

## Tailwind 扫描源

`src/styles/global.css` 必须把 starter 包的 dashboard 产物加进 Tailwind v4 扫描源：

```css
@source "../../node_modules/@shanjing/astro-full-stack-starter/dist/dashboard";
```

少了这行，package shell 里的 sidebar、table、badge、`data-state` variant 和响应式 class 不会进最终 CSS。调整后要跑 `pnpm check` 和 `pnpm build`。

## Sidebar active 属性

侧边栏使用 Tailwind v4 的 `data-active:*` presence variant。React 组件只在 `isActive === true` 时渲染 `data-active="true"`，普通菜单保持属性缺省，访问态样式只落在当前菜单项。

active 判定按菜单形态区分：根级叶子菜单用精确 URL 匹配；带子菜单的父级菜单按自身 URL 或子项 URL 的子路径保持 active；隐藏的动态详情页按最近的可见子菜单 URL 归属，例如 `/admin/queues/jobs/failed/record-1` 归属到 `/admin/queues/jobs/failed`。

代码证据：`src/components/ui/sidebar.tsx`、`tests/unit/astro-fullstack-starter/admin-sidebar.test.tsx`。

## 业务组件

admin 业务组件放在 `src/components/admin/`，dashboard 页面自身组件放 `src/dashboards/<id>/`。组件 props 优先用局部 `type` 定义，复杂复用结构再导出类型。

代码证据：`src/components/admin/login-form.tsx`、`src/components/admin/install-form.tsx`（`React.ComponentProps<"div">` 加业务字段扩展）。

## 表格组件

列表页用 starter 包的 `DataTable<TItem>`：

- 列配置是 `DataTableColumn<TItem>[]`，每列提供 `key`、`header`、`render(item)`。
- 行 key 由页面传 `getRowKey(item)`。
- 空状态由页面传 `emptyText`，常见写法是 loading 时显示 `"Loading"`。
- 状态列用 `StatusBadge`，时间列用 `DateTimeCell`。

代码证据：`src/dashboards/admin/pages/shop-list.tsx`、`src/dashboards/admin/pages/order-list.tsx`、`src/dashboards/member/pages/shop-list.tsx`。

## 表单组件

服务端 POST 表单用标准 `<form method="post" action="...">`，字段用 `Field`、`FieldLabel`、`FieldDescription`、`Input` 组合。当前约定：

- 输入项用 `id` + `name`，label 用 `htmlFor` 指向 input `id`。
- 错误容器用 `role="alert"`，字段错误用 `aria-invalid={Boolean(error)}`。
- 默认值通过 `defaultValue` 从 Astro 页面传入。
- 密码字段设置 `autoComplete`：登录用 `current-password`，安装用 `new-password`。

代码证据：`src/components/admin/login-form.tsx`、`src/components/admin/install-form.tsx`。

## 列表筛选表单

SPA 列表筛选用 `React.SyntheticEvent<HTMLFormElement>` + `FormData(event.currentTarget)`，读取后用 `setSearchParams()` 写回 URL：

```ts
function applyFilters(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextSlug = String(formData.get("slug") ?? "").trim();

    setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.set("page", "1");
        return nextParams;
    });
}
```

表单 JSX 使用 `useResettableFilterForm(searchParamsKey)` 返回的 `formKey` 与 `formRef`；Reset 先 `resetForm()` 再写回 search params。字段控件的 `aria-label` 用字段名，如 `Status`、`Slug`、`Created at range`。筛选按钮统一放在表单末尾，使用 lucide 图标（`FilterIcon`、`RotateCcwIcon`、`RefreshCwIcon`）。

代码证据：`src/dashboards/admin/pages/shop-list.tsx`、`src/dashboards/admin/pages/product-list.tsx`、`src/dashboards/admin/pages/order-list.tsx`。

## 纯 Astro 测试页控件边界

`src/pages/test/*.astro` 是静态 Astro 工具页，交互由内联脚本按 DOM id 绑定。这里的 `button`、`select`、`textarea` 保留原生写法，不为了复用 React 组件引入 island hydration。新增 React dashboard 或 island 时，才用 `src/components/ui/**` 的 shadcn/ui 组件。

代码证据：`src/pages/test/queue.astro`、`src/pages/test/graphql.astro`。

## 队列测试页动作按钮

`/test/queue` 按 logical channel 展示队列卡片。通道标签和成功结果卡片可以用各自通道色，但所有 success 派发按钮统一用 default 通道的按钮色：

```astro
const defaultSuccessButtonClass = queueTones.default?.button ?? queueTones.fallback.button;
```

页面测试要断言 success 按钮引用了 `defaultSuccessButtonClass`。
