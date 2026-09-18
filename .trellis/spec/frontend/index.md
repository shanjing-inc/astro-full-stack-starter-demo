# Demo 应用开发规范

> 本目录描述 demo 仓库自身的约定。路径都相对仓库根目录，命令都在仓库根目录执行。
>
> 这些规范**可以照抄**给基于本 demo 建仓的项目：规则部分直接用，事实部分（实体名、端点路径、占位路径、目录、命名后缀）按 [reuse-guide.md](./reuse-guide.md) 换成你自己的。

## 适用范围

本仓是 Astro 全栈 demo：Astro 7 + React SPA + GraphQL Yoga + Drizzle + MySQL，运行目标是 Deno。基础设施能力来自已发布的 `@shanjing/astro-full-stack-starter` 包。

本仓只保留业务路由、业务 schema、业务 resolver、业务 job 和运行时专属配置。通用能力不在本仓重复实现。规范只记录本仓有代码或测试证据的约定；改代码、改目录或改命令时同步更新对应规范，规范和代码放在同一次提交。

## 规范索引

| 规范                                               | 内容                                                 | 状态   |
| -------------------------------------------------- | ---------------------------------------------------- | ------ |
| [带进你的项目](./reuse-guide.md)                   | 照抄哪些、换成你自己的哪些、怎么验证                 | 已填充 |
| [目录结构规范](./directory-structure.md)           | 源码、测试、脚本、迁移和生成物的归属                 | 已填充 |
| [质量规范](./quality-guidelines.md)                | 安装、检查、测试命令与 TDD 证据要求                  | 已填充 |
| [GraphQL 规范](./graphql-guidelines.md)            | 端点清单、命名规则、新增接口步骤                     | 已填充 |
| [GraphQL DataLoader 规范](./graphql-dataloader.md) | Request cache 与字段级批处理契约                     | 已填充 |
| [组件规范](./component-guidelines.md)              | shadcn/ui 基础组件、starter 共享组件、表格与表单     | 已填充 |
| [Hook 规范](./hook-guidelines.md)                  | useDashboardQuery、命令式请求与响应式 hook           | 已填充 |
| [状态管理规范](./state-management.md)              | URL / 服务端 / 本地 / 持久化状态与 React Router 契约 | 已填充 |
| [guides/index.md](../guides/index.md)              | task 写作、TDD 思考、代码复用与跨层思考指南          | 已填充 |

## 接入方要换的事实

照抄这些规范时，下面这些是本 demo 的选择，必须按你自己的项目改：

- 端点名、端点路径、adapter 与 schema 文件。
- 字段注册的目录与方式（`types`/`queries`/`mutations` 分文件，还是 `schemas/*.ts` 工厂）。
- 类型与 Input 的命名后缀（`...Filters`/`...Item`，还是 `...WhereInput`/`...OrderByInput`）。
- 是否有手写 `src/pages/api/graphql/**` 文件路由。
- 字段级批处理与 request cache 的用法（`t.loadable()` 还是只靠 request cache）。
- 错误守卫与 Sentry 上报入口的实际位置。

完整清单与验证命令见 [reuse-guide.md](./reuse-guide.md)。

## 前置检查

- 改代码前先判断改动落在哪个目录，再读对应规范。
- 生产行为、GraphQL、UI 交互、队列或持久化改动，先在 task 文档写 TDD 计划。
- starter 包的能力缺口写进 task 论证，不要在本仓内复制包实现。
- 生成物（`src/graphql/generated/`、队列清单）不手工编辑，改完源码后重新生成。

## 最小 Trellis context

`{task}/implement.jsonl` 与 `{task}/check.jsonl` 建议加入：

```jsonl
{"file": ".trellis/spec/frontend/index.md", "reason": "规范入口"}
{"file": ".trellis/spec/frontend/directory-structure.md", "reason": "确认文件归属与模块边界"}
{"file": ".trellis/spec/frontend/quality-guidelines.md", "reason": "确认检查与测试命令"}
{"file": ".trellis/spec/frontend/graphql-guidelines.md", "reason": "确认端点选择、命名规则、字段注册与 codegen 步骤"}
{"file": ".trellis/spec/frontend/component-guidelines.md", "reason": "确认组件与表单写法"}
{"file": ".trellis/spec/frontend/hook-guidelines.md", "reason": "确认数据请求 hook 用法"}
{"file": ".trellis/spec/frontend/state-management.md", "reason": "确认 URL、服务端与持久化状态边界"}
{"file": ".trellis/spec/guides/tdd-thinking-guide.md", "reason": "从 AC 派生测试并记录 RED/GREEN 证据"}
```
