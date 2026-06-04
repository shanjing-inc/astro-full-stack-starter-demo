# Cloudflare D1 Demo

[English](./README.md) | [中文](./README.zh-CN.md)

This demo shows how to run the Astro full-stack starter on Cloudflare with D1 as the database layer. It is a focused example for edge-oriented deployments that need local development, test coverage, and Cloudflare-specific build checks.

## Tech Stack

- Astro full-stack application structure
- Cloudflare runtime target
- Cloudflare D1 database
- Wrangler-based local and deployment workflows
- Unit tests for application behavior

## Getting Started

Run commands from the workspace root:

```bash
pnpm install
pnpm --filter cloudflare-d1-demo dev
```

To see every script exposed by this demo:

```bash
pnpm --filter cloudflare-d1-demo run
```

## Common Commands

```bash
pnpm --filter cloudflare-d1-demo dev
pnpm --filter cloudflare-d1-demo test
pnpm --filter cloudflare-d1-demo check
pnpm --filter cloudflare-d1-demo build
```

The workspace-level quality gate also includes this demo:

```bash
pnpm check
```

## Browser Test Pages

After starting the dev server, open the pages from `src/pages/test/*.astro` to exercise demo features in the browser:

- `/test/cache`: probes the Cloudflare cache contract across Workers KV, Cache API, and Durable Objects, including lock behavior through the lock action links.
- `/test/graphql`: sends preset or custom requests to the member and super-admin GraphQL endpoints backed by the D1 provider.
- `/test/mysql`: keeps the shared route name while checking the D1 binding, Drizzle D1 provider, and `shop` table preview.
- `/test/queue`: dispatches Cloudflare Queues demo jobs by logical queue, shows the current request result, and displays D1-backed execution records.
- `/test/sse`: connects to the public SSE endpoint and shows incoming server-sent events.
- `/test/websocket`: tests public, member, and super-admin WebSocket endpoints with ping, echo, custom messages, and server push.

These pages are runnable integration examples for local manual checks and for understanding how the demo wires starter-level features into the Cloudflare runtime.

## Cloudflare Configuration

Use this demo for Cloudflare-specific runtime checks and D1 integration work. Keep Cloudflare account, database, and deployment settings in the demo-level configuration files used by the project.

For local development, verify that the D1 database binding in the Cloudflare configuration matches the binding name expected by the application.

## Environment

Create the demo environment file from the project conventions used in this workspace, then provide the Cloudflare and application settings required by the app.

Typical values include:

- Cloudflare account or deployment settings
- D1 database binding and identifiers
- Application secrets used by server-side code

Use local-only values for development secrets.

## Deployment Notes

Use this demo when you want to validate the Cloudflare runtime path with D1. Run the demo-level check before deployment so tests, formatting, and build-time Cloudflare assumptions stay aligned.
