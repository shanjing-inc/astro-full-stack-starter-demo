CREATE TABLE IF NOT EXISTS "user" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "email_verified" integer DEFAULT false NOT NULL,
    "image" text,
    "role" text,
    "banned" integer DEFAULT false,
    "ban_reason" text,
    "ban_expires" integer,
    "created_at" integer DEFAULT (unixepoch()) NOT NULL,
    "updated_at" integer DEFAULT (unixepoch()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email");
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user" ("role");

CREATE TABLE IF NOT EXISTS "session" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "expires_at" integer NOT NULL,
    "token" text NOT NULL,
    "created_at" integer DEFAULT (unixepoch()) NOT NULL,
    "updated_at" integer DEFAULT (unixepoch()) NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "user_id" integer NOT NULL,
    "impersonated_by" text,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token");
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id");

CREATE TABLE IF NOT EXISTS "account" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" integer NOT NULL,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" integer,
    "refresh_token_expires_at" integer,
    "scope" text,
    "password" text,
    "created_at" integer DEFAULT (unixepoch()) NOT NULL,
    "updated_at" integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_unique" ON "account" ("provider_id", "account_id");

CREATE TABLE IF NOT EXISTS "verification" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" integer NOT NULL,
    "created_at" integer DEFAULT (unixepoch()) NOT NULL,
    "updated_at" integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

CREATE TABLE IF NOT EXISTS "shop" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "status" text DEFAULT 'draft' NOT NULL,
    "created_at" integer DEFAULT (unixepoch()) NOT NULL,
    "updated_at" integer DEFAULT (unixepoch()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "shop_slug_unique" ON "shop" ("slug");
CREATE INDEX IF NOT EXISTS "shop_status_idx" ON "shop" ("status");

CREATE TABLE IF NOT EXISTS "product" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "shop_id" integer NOT NULL,
    "name" text NOT NULL,
    "sku" text NOT NULL,
    "price_in_cents" integer NOT NULL,
    "inventory_count" integer DEFAULT 0 NOT NULL,
    "status" text DEFAULT 'draft' NOT NULL,
    "created_at" integer DEFAULT (unixepoch()) NOT NULL,
    "updated_at" integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_shop_sku_unique" ON "product" ("shop_id", "sku");
CREATE INDEX IF NOT EXISTS "product_shop_id_idx" ON "product" ("shop_id");
CREATE INDEX IF NOT EXISTS "product_status_idx" ON "product" ("status");

CREATE TABLE IF NOT EXISTS "order" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "shop_id" integer NOT NULL,
    "product_id" integer NOT NULL,
    "order_no" text NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price_in_cents" integer NOT NULL,
    "total_amount_in_cents" integer NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "remark" text,
    "created_at" integer DEFAULT (unixepoch()) NOT NULL,
    "updated_at" integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("product_id") REFERENCES "product"("id") ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "order_order_no_unique" ON "order" ("order_no");
CREATE INDEX IF NOT EXISTS "order_shop_id_idx" ON "order" ("shop_id");
CREATE INDEX IF NOT EXISTS "order_product_id_idx" ON "order" ("product_id");
CREATE INDEX IF NOT EXISTS "order_status_idx" ON "order" ("status");

CREATE TRIGGER IF NOT EXISTS "user_updated_at_trigger"
AFTER UPDATE ON "user"
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE "user" SET updated_at = unixepoch() WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS "session_updated_at_trigger"
AFTER UPDATE ON "session"
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE "session" SET updated_at = unixepoch() WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS "account_updated_at_trigger"
AFTER UPDATE ON "account"
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE "account" SET updated_at = unixepoch() WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS "verification_updated_at_trigger"
AFTER UPDATE ON "verification"
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE "verification" SET updated_at = unixepoch() WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS "shop_updated_at_trigger"
AFTER UPDATE ON "shop"
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE "shop" SET updated_at = unixepoch() WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS "product_updated_at_trigger"
AFTER UPDATE ON "product"
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE "product" SET updated_at = unixepoch() WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS "order_updated_at_trigger"
AFTER UPDATE ON "order"
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE "order" SET updated_at = unixepoch() WHERE id = OLD.id;
END;
