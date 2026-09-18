<!-- PROJECT:START -->

# 项目规则

- 本目录会作为独立 demo 仓发布给外部项目用；`.trellis/spec/` 的规范允许照抄，替换点清单见 `.trellis/spec/frontend/reuse-guide.md`。

## 通用

- 代码缩进 4 个空格，不使用 tab；每行结尾加分号。
- 禁止动态 import；尽量保留注释，不要删除；尽量增加 JSDoc 注释。
- 统一用 pnpm，禁止 npm 或 yarn。
- 禁止后端返回全部数据再由前端过滤，按查询条件在后端取所需数据。
- 自定义错误不要用 `throw new Error()`：GraphQL resolver/helper 用 `GraphQLError`，Astro 页面、API route、middleware、构建期逻辑用 `AstroError`。
- 改代码、改目录、改命令或改用 starter 新能力时，同步更新 `.trellis/spec/` 对应规范；规范与代码同一次提交。

## 技术栈与版本

- Astro 7.x、Tailwind CSS 4.x、Nanostores（持久化用 Nano Stores Persistent）、Drizzle ORM、zod、bullmq 都用满足七天发布时间门禁的最新稳定版，不降级。
- 数据库用 MySQL 8.0.x。
- 所有第三方依赖严格执行 `minimumReleaseAge: 10080`；`minimumReleaseAgeExclude` 固定且仅包含 `@shanjing-inc/wechat-node-sdk` 与 `@shanjing/astro-full-stack-starter`；依赖升级后必须通过 `pnpm install --frozen-lockfile` 的供应链策略校验。

## UI 与应用结构

- UI 控件优先使用 shadcn/ui 已有组件；仅在 shadcn/ui 没有对应组件，或业务交互超出组件能力时自行实现，并在相关代码或任务文档中说明原因。
- `src/dashboards` 下是 dashboard 应用，用 React Router 管理路由；入口路径由 `astro.config.mjs` 的 `dashboard.instances.<id>.path` 控制（示例占位路径 `/replace-with-your-admin-path`），逻辑放 `src/dashboards/<dashboard-id>/`，UI 基础组件放 `src/components/ui/`，业务组件放 `src/components/<dashboard-id>/`。
- header 属性优先通过 astro-seo 设置，不要直接在 html 中设置。
- React 表单加 `initialized` 状态，数据加载完成前不渲染表单。
- `FormEvent` 已废弃，用 `React.SyntheticEvent<HTMLFormElement>` 替代；`ElementRef` 已废弃，改用当前写法。

## 数据与认证

- 数据库表名用单数形式。
- better-auth 优先服务端认证方式，服务端无法完成时才用客户端 API；signin / signout 不要用 `Astro.redirect`，它不携带 cookie，无法完成登录登出。

## GraphQL

- 端点、命名与注册流程见 `.trellis/spec/frontend/graphql-guidelines.md`；字段级批处理见 `.trellis/spec/frontend/graphql-dataloader.md`。

<!-- PROJECT:END -->

<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
