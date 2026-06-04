# Astro Full Stack Starter Demo

English | [中文](./README.zh-CN.md)

This repository contains two independent Astro full-stack demos. Each demo is maintained on its own branch.

## Demo Branches

| Demo | Branch | Description |
| --- | --- | --- |
| Cloudflare D1 Demo | [`origin/cloudflare-d1-demo`](../../tree/cloudflare-d1-demo) | Full-stack Astro demo for Cloudflare Workers and D1. |
| Deno MySQL Demo | [`origin/deno-mysql-demo`](../../tree/deno-mysql-demo) | Full-stack Astro demo for Deno and MySQL. |

## Documentation

Detailed documentation is available at:

https://shanjing.mintlify.app/

## Usage

List remote branches:

```bash
git branch -r
```

Check out a demo branch:

```bash
git switch -c cloudflare-d1-demo --track origin/cloudflare-d1-demo
git switch -c deno-mysql-demo --track origin/deno-mysql-demo
```
