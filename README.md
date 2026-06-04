# Deno MySQL Demo

[English](./README.md) | [中文](./README.zh-CN.md)

This demo shows how to run the Astro full-stack starter on Deno with a MySQL-backed application stack. It is designed as a runnable example for teams that want a Node-compatible Astro app with Deno deployment semantics and database-backed workflows.

## Tech Stack

- Astro full-stack application structure
- Deno runtime target
- MySQL database access
- Queue job discovery through a generated manifest
- Unit and integration tests for server-side workflows

## Getting Started

Run commands from the workspace root:

```bash
pnpm install
pnpm --filter deno-mysql-demo dev
```

To see every script exposed by this demo:

```bash
pnpm --filter deno-mysql-demo run
```

## Common Commands

```bash
pnpm --filter deno-mysql-demo dev
pnpm --filter deno-mysql-demo test
pnpm --filter deno-mysql-demo check
pnpm --filter deno-mysql-demo build
```

The workspace-level quality gate also includes this demo:

```bash
pnpm check
```

## Browser Test Pages

After starting the dev server, open the pages from `src/pages/test/*.astro` to exercise demo features in the browser:

- `/test/cache`: writes short-lived probe data through the Redis cache adapter, then shows TTL readback and lock behavior through the lock action links.
- `/test/graphql`: sends preset or custom requests to the member and super-admin GraphQL endpoints.
- `/test/mysql`: checks the native MySQL connection, verifies the Drizzle provider, and previews the `shop` table.
- `/test/queue`: dispatches BullMQ demo jobs by queue, shows the current request result, and displays recent Redis-backed execution records.
- `/test/sse`: connects to the public SSE endpoint and shows incoming server-sent events.
- `/test/websocket`: tests public, member, and super-admin WebSocket endpoints with ping, echo, custom messages, and server push.

These pages are runnable integration examples for local manual checks and for understanding how the demo wires starter-level features into the Deno runtime.

## Queue Manifest

This demo includes a queue manifest generator. The generator scans queue job modules and writes the generated manifest used by the queue runtime and queue tests.

The standalone test command owns that prerequisite, so `pnpm --filter deno-mysql-demo test` is the usual entry point for queue-related verification.

## Environment

Create the demo environment file from the project conventions used in this workspace, then provide the MySQL connection settings required by the app.

Typical values include:

- Database host
- Database port
- Database user
- Database password
- Database name

Use local-only values for development secrets.

## Deployment Notes

Use this demo when you want to validate the Deno runtime path with a MySQL-backed application. Keep runtime-specific configuration inside this demo so the shared starter package stays reusable across deployment targets.
