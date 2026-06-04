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
