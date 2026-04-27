CREATE TABLE "admin_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "spec_field_group_translations" (
	"group_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "spec_field_group_translations_group_id_locale_pk" PRIMARY KEY("group_id","locale"),
	CONSTRAINT "spec_field_group_translations_locale_check" CHECK ("spec_field_group_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "spec_field_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"key" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_translation_field_flags" (
	"product_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"field_name" text NOT NULL,
	"machine_translated" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_translation_field_flags_product_id_locale_field_name_pk" PRIMARY KEY("product_id","locale","field_name")
);
--> statement-breakpoint
DROP INDEX "spec_field_category_key_idx";--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
UPDATE "product" SET "status" = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END;--> statement-breakpoint
ALTER TABLE "spec_field" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "spec_field" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "spec_field_group_translations" ADD CONSTRAINT "spec_field_group_translations_group_id_spec_field_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."spec_field_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_field_group" ADD CONSTRAINT "spec_field_group_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translation_field_flags" ADD CONSTRAINT "product_translation_field_flags_product_id_locale_product_translations_product_id_locale_fk" FOREIGN KEY ("product_id","locale") REFERENCES "public"."product_translations"("product_id","locale") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spec_field_group_translations_locale_idx" ON "spec_field_group_translations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_field_group_category_key_idx" ON "spec_field_group" USING btree ("category_id","key") WHERE "spec_field_group"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "spec_field" ADD CONSTRAINT "spec_field_group_id_spec_field_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."spec_field_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spec_field_category_key_idx" ON "spec_field" USING btree ("category_id","key") WHERE "spec_field"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_status_check" CHECK ("product"."status" IN ('draft','published'));--> statement-breakpoint
CREATE VIEW "public"."product_translation_completeness" AS (
  WITH base AS (
    SELECT pt.product_id, pt.locale,
           (CASE WHEN coalesce(pt.name,'')        <> '' THEN 1 ELSE 0 END +
            CASE WHEN coalesce(pt.short_desc,'')  <> '' THEN 1 ELSE 0 END +
            CASE WHEN coalesce(pt.long_desc,'')   <> '' THEN 1 ELSE 0 END +
            CASE WHEN coalesce(pt.slug,'')        <> '' THEN 1 ELSE 0 END) AS filled,
           4 AS total
      FROM product_translations pt
  ),
  spec_required AS (
    SELECT psv.product_id, sf.id AS spec_field_id
      FROM product_spec_values psv
      JOIN spec_field sf ON sf.id = psv.spec_field_id
     WHERE sf.required = true AND sf.data_type = 'text' AND sf.deleted_at IS NULL
  ),
  spec_required_count AS (
    SELECT product_id, COUNT(*)::int AS cnt FROM spec_required GROUP BY product_id
  ),
  spec_filled AS (
    SELECT psv.product_id, psvt.locale, COUNT(*)::int AS cnt
      FROM product_spec_values psv
      JOIN spec_field sf ON sf.id = psv.spec_field_id
      JOIN product_spec_value_translations psvt ON psvt.value_id = psv.id
     WHERE sf.required = true AND sf.data_type = 'text' AND sf.deleted_at IS NULL
       AND coalesce(psvt.text_value,'') <> ''
     GROUP BY psv.product_id, psvt.locale
  )
  SELECT base.product_id,
         base.locale,
         ROUND(
           100.0 * (base.filled + COALESCE(sf.cnt, 0))
                 / NULLIF(base.total + COALESCE(sr.cnt, 0), 0)
         )::int AS percent
    FROM base
    LEFT JOIN spec_required_count sr ON sr.product_id = base.product_id
    LEFT JOIN spec_filled sf
           ON sf.product_id = base.product_id AND sf.locale = base.locale
);