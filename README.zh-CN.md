# Astro Full Stack Starter Demo

[English](./README.md) | 中文

这个仓库包含两个独立的 Astro 全栈 demo。每个 demo 维护在各自的分支中。

## Demo 分支

| Demo | 分支 | 说明 |
| --- | --- | --- |
| Cloudflare D1 Demo | [`origin/cloudflare-d1-demo`](../../tree/cloudflare-d1-demo) | 面向 Cloudflare Workers 和 D1 的 Astro 全栈示例。 |
| Deno MySQL Demo | [`origin/deno-mysql-demo`](../../tree/deno-mysql-demo) | 面向 Deno 和 MySQL 的 Astro 全栈示例。 |

## 文档

详细文档见：

https://shanjing.mintlify.app/

## 使用

查看远端分支：

```bash
git branch -r
```

切换到 demo 分支：

```bash
git switch -c cloudflare-d1-demo --track origin/cloudflare-d1-demo
git switch -c deno-mysql-demo --track origin/deno-mysql-demo
```
