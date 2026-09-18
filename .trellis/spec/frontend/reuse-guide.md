# 把这份规范带进你的项目

> 这个 demo 仓库是给独立项目用的起点。下面这份规范可以**直接照抄**，只需要把 demo 自己的事实换掉。不需要从零重写规范，也不要因为「不是我的项目」就整份丢掉。

## 第一步：照抄骨架

把这几个目录整体复制到你的项目（放在仓库根目录）：

```text
.trellis/workflow.md      # 开发阶段与任务流程
.trellis/config.yaml      # Trellis 配置
.trellis/scripts/         # task.py、get_context.py 等
.trellis/agents/          # 子代理提示词
.trellis/spec/guides/     # 任务写作、TDD、代码复用、跨层思考
.trellis/spec/frontend/   # 本目录：应用开发规范
AGENTS.md                 # Trellis 说明块 + 项目规则块
```

`.trellis/tasks/` 和 `.trellis/workspace/` 是运行数据，不要复制。

## 第二步：按下面的清单改事实

规范化分两类：**写规则的部分**照抄；**写具体值的部分**换成你自己的。

| 文件                                    | 直接照抄                                                                                                                         | 必须换成你自己的                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `spec/frontend/graphql-guidelines.md`   | 命名规则（`get*`/`list*`/`create*`/`update*`/`delete*`、camelCase、字段排序）、`set`/`where` 职责、参数规模、新增接口的 8 步流程 | 端点名与路径、adapter/schema 文件、有没有手写 `src/pages/api/graphql/**` route、字段注册目录与方式、类型与 Input 命名后缀 |
| `spec/frontend/graphql-dataloader.md`   | request cache 的用法与「同 Request 共享、跨 Request 隔离」契约                                                                   | 你是否用 `t.loadable()`、聚合字段与 loader key、字段级 SQL 位置                                                           |
| `spec/frontend/directory-structure.md`  | 「一目录一类归属」「生成物不手改」的判断方式                                                                                     | 目录清单本身（表里每一行都按你的项目核对）                                                                                |
| `spec/frontend/quality-guidelines.md`   | 命令分层（迭代只跑受影响用例、收尾一次跑完整检查）、TDD 证据要求                                                                 | 具体命令名与脚本内容                                                                                                      |
| `spec/frontend/component-guidelines.md` | shadcn/ui 用法、表单可访问性、测试页控件边界                                                                                     | 业务组件目录、表格列配置、筛选字段                                                                                        |
| `spec/frontend/hook-guidelines.md`      | 页面数据用 `useDashboardQuery`、命令式请求用 `executeDashboardGraphQL`、不自己写 fetch                                           | 具体页面与生成的 operation 类型路径                                                                                       |
| `spec/frontend/state-management.md`     | URL / 服务端 / 本地 / 持久化四类状态的放置原则、React Router 导入契约                                                            | dashboard id、storage key、路由路径                                                                                       |
| `spec/guides/*`                         | 全部照抄                                                                                                                         | 无                                                                                                                        |
| `AGENTS.md` 的项目规则块                | 通用、技术栈、错误处理、命名等条目                                                                                               | dashboard 占位路径、表名约定中与你的库不一致的部分                                                                        |

占位路径、示例实体名（`shop`、`order`、`product`）、“本仓没有手写 route” 这类句子，都是 demo 事实，必须按你的项目实际情况改。

## 第三步：改完验证

- `rg -n "deno-mysql-demo|/replace-with-your-admin-path|/api/graphql/member" .trellis AGENTS.md`：确认没有残留的 demo 事实。
- 每条规范都能在你自己仓库里找到代码或测试证据；找不到就删掉，别留下和代码不符的规则。
- 跑一遍你项目的完整检查（这个 demo 是 `pnpm check`）。

## 为什么值得照抄

规范里写死的部分是 demo 的选择，写规则的部分是踩过坑之后的结论：比如端点声明交给 integration、member 与 admin 用两份 schema 隔离权限、列表筛选状态放 URL、request cache 按 Request 隔离、生成物不手改。这些结论换项目依然成立，只是要把名字和路径换成你的。
