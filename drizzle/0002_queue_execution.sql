CREATE TABLE IF NOT EXISTS "queue_execution" (
    "id" text PRIMARY KEY NOT NULL,
    "job_id" text NOT NULL,
    "message_id" text,
    "queue_name" text NOT NULL,
    "job_name" text NOT NULL,
    "mode" text,
    "source" text,
    "status" text DEFAULT 'queued' NOT NULL,
    "attempt" integer DEFAULT 1 NOT NULL,
    "requested_at" text NOT NULL,
    "processed_at" text,
    "retry_of_record_id" text,
    "physical_queue_name" text,
    "payload" text,
    "result" text,
    "error" text,
    "created_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    "updated_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS "queue_execution_job_id_idx" ON "queue_execution" ("job_id");
CREATE INDEX IF NOT EXISTS "queue_execution_queue_updated_at_idx" ON "queue_execution" ("queue_name", "updated_at");
CREATE INDEX IF NOT EXISTS "queue_execution_retry_of_record_id_idx" ON "queue_execution" ("retry_of_record_id");
CREATE INDEX IF NOT EXISTS "queue_execution_status_updated_at_idx" ON "queue_execution" ("status", "updated_at");
CREATE INDEX IF NOT EXISTS "queue_execution_status_idx" ON "queue_execution" ("status");
CREATE INDEX IF NOT EXISTS "queue_execution_updated_at_idx" ON "queue_execution" ("updated_at");
