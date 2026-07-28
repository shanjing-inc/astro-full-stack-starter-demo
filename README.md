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
pnpm --filter deno-mysql-demo db:migration:bundle
```

The workspace-level quality gate also includes this demo:

```bash
pnpm check
```

## Browser Test Pages

After starting the dev server, open the pages from `src/pages/test/*.astro` to exercise demo features in the browser:

- `/test/cache`: writes short-lived probe data through the Redis cache adapter, then shows TTL readback and lock behavior through the lock action links.
- `/test/graphql`: sends preset or custom requests to the member and admin GraphQL endpoints.
- `/test/database`: checks the native MySQL connection, verifies the Drizzle provider, and previews the `shop` table.
- `/test/queue`: dispatches BullMQ demo jobs by queue, shows the current request result, and displays recent Redis-backed execution records.
- `/test/sse`: connects to the public SSE endpoint and shows incoming server-sent events.
- `/test/websocket`: tests public, member, and admin WebSocket endpoints with ping, echo, custom messages, and server push.

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
- `DENO_SERVE_PARALLEL`: whether Docker/`start-web.sh` enables `deno serve --parallel`. Default `0` (off, lower RSS); set `1`/`true`/`on` to enable multi-thread serve
- `DENO_IDLE_MEMORY_RECLAIM_*`: idle memory reclaim (off by default). Set `DENO_IDLE_MEMORY_RECLAIM_ENABLED=1` to enable; see `docs-site/guides/deno-memory.mdx`
- Diagnostics: `GET /api/internal/runtime-memory` (`heapUsed` / `vmRss` / `rssAnon` / `rssFile` / `threads` in MB + idle reclaim state)
- Permissions: `start-web.sh` uses `--allow-all` so Deno 2.7+ can read `/proc/self/status`
- jemalloc: provided by **BASE_IMAGE** (`docker/base-node.Dockerfile` installs `libjemalloc2`); does **not** enable `LD_PRELOAD` by default; opt in at deploy time with `MALLOC_CONF=background_thread:true,dirty_decay_ms:5000,narenas:2`

Use local-only values for development secrets.

## Deployment Notes

Use this demo when you want to validate the Deno runtime path with a MySQL-backed application. Keep runtime-specific configuration inside this demo so the shared starter package stays reusable across deployment targets.

### Database Migration Bundle

For standalone demo releases, CI can generate a database migration bundle:

```bash
pnpm db:migration:bundle
```

The output lives in `dist/migration/` and contains:

- `drizzle/**/migration.sql`
- `migrate.mjs`
- `migrate.sh`
- `deno.lock`
- `README.md`

Run a preflight check on the customer server or deployment host:

```bash
DATABASE_URL="mysql://user:password@host:3306/database" ./dist/migration/migrate.sh --dry-run
```

`--dry-run` connects to MySQL, reads `__drizzle_migrations`, prints the target database summary, pending migrations, and statement counts, then skips SQL execution.

Run pending migrations after the preflight check:

```bash
DATABASE_URL="mysql://user:password@host:3306/database" ./dist/migration/migrate.sh
```

The runner executes SQL in `drizzle/` folder-name order and writes records compatible with Drizzle's MySQL `__drizzle_migrations` table. Logs include host, port, database, and a masked username.

### Release Order

Use expand / deploy / contract:

1. Generate and ship `dist/migration/`.
2. Run `./migrate.sh --dry-run` before updating the application Docker image.
3. Run `./migrate.sh` after the preflight check passes, carrying compatible schema changes.
4. Roll out the application Docker image across all servers.
5. Handle contract changes in a later cleanup release after the rollback window closes.

Pre-update migrations carry compatible changes:

- New tables.
- New nullable columns.
- New columns with defaults.
- New indexes.
- Existing columns, tables, and constraint semantics remain available.

Cleanup releases carry contract changes:

- Dropping columns or tables.
- Removing old columns after renames.
- Tightening nullable columns.
- Changing field semantics.
- Removing old constraint semantics.

During a multi-server rolling update, old and new application images share the same compatible schema. Image rollback relies on that compatibility rule: while the database remains in the expand state, the application image can roll back to the previous version. MySQL DDL can commit implicitly, so failed migration recovery depends on pre-release backups, migration splitting, and operator review.
