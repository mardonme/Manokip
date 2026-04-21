CREATE TYPE "public"."spec_data_type" AS ENUM('number', 'text', 'enum', 'bool');--> statement-breakpoint
CREATE TYPE "public"."spec_filter_kind" AS ENUM('range', 'select', 'toggle');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "auth_accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL,
	"absolute_expires" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "admin_user" (
	"email" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"invited_by" text,
	"invited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_email" text,
	"action" text,
	"entity_type" text,
	"entity_id" text,
	"before_json" jsonb,
	"after_json" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_translations" (
	"category_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	CONSTRAINT "category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "category_translations_locale_check" CHECK ("category_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "manufacturer_translations" (
	"manufacturer_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	CONSTRAINT "manufacturer_translations_manufacturer_id_locale_pk" PRIMARY KEY("manufacturer_id","locale"),
	CONSTRAINT "manufacturer_translations_locale_check" CHECK ("manufacturer_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "manufacturer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logo_public_id" text,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_translations" (
	"product_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_desc" text,
	"long_desc" text,
	CONSTRAINT "product_translations_product_id_locale_pk" PRIMARY KEY("product_id","locale"),
	CONSTRAINT "product_translations_locale_check" CHECK ("product_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"manufacturer_id" uuid,
	"sku" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "spec_field_enum_option_translations" (
	"option_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "spec_field_enum_option_translations_option_id_locale_pk" PRIMARY KEY("option_id","locale"),
	CONSTRAINT "spec_field_enum_option_translations_locale_check" CHECK ("spec_field_enum_option_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "spec_field_enum_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spec_field_id" uuid NOT NULL,
	"key" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_field_translations" (
	"spec_field_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "spec_field_translations_spec_field_id_locale_pk" PRIMARY KEY("spec_field_id","locale"),
	CONSTRAINT "spec_field_translations_locale_check" CHECK ("spec_field_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "spec_field" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"key" text NOT NULL,
	"data_type" "spec_data_type" NOT NULL,
	"unit" text,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"filter_kind" "spec_filter_kind",
	"filter_group_key" text
);
--> statement-breakpoint
CREATE TABLE "product_spec_value_translations" (
	"value_id" bigint NOT NULL,
	"locale" text NOT NULL,
	"text_value" text,
	CONSTRAINT "product_spec_value_translations_value_id_locale_pk" PRIMARY KEY("value_id","locale"),
	CONSTRAINT "psvt_locale_check" CHECK ("product_spec_value_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "product_spec_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"spec_field_id" uuid,
	"is_extra" boolean DEFAULT false NOT NULL,
	"extra_key" text,
	"num_value" numeric,
	"text_value" text,
	"bool_value" boolean,
	"enum_value" text,
	"unit" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "psv_extra_key_check" CHECK ("product_spec_values"."is_extra" = false OR "product_spec_values"."extra_key" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "product_search" (
	"product_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"search_tsv" "tsvector" NOT NULL,
	CONSTRAINT "product_search_product_id_locale_pk" PRIMARY KEY("product_id","locale"),
	CONSTRAINT "product_search_locale_check" CHECK ("product_search"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "recipe_translations" (
	"recipe_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"body" jsonb,
	CONSTRAINT "recipe_translations_recipe_id_locale_pk" PRIMARY KEY("recipe_id","locale"),
	CONSTRAINT "recipe_translations_locale_check" CHECK ("recipe_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"featured_image_public_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"featured_image_public_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industry_translations" (
	"industry_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"body" jsonb,
	CONSTRAINT "industry_translations_industry_id_locale_pk" PRIMARY KEY("industry_id","locale"),
	CONSTRAINT "industry_translations_locale_check" CHECK ("industry_translations"."locale" IN ('uz','ru','en'))
);
--> statement-breakpoint
CREATE TABLE "contact_submission" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text,
	"company" text,
	"email" text,
	"phone" text,
	"message" text NOT NULL,
	"locale" text,
	"source_page" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturer_translations" ADD CONSTRAINT "manufacturer_translations_manufacturer_id_manufacturer_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_manufacturer_id_manufacturer_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_field_enum_option_translations" ADD CONSTRAINT "spec_field_enum_option_translations_option_id_spec_field_enum_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."spec_field_enum_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_field_enum_option" ADD CONSTRAINT "spec_field_enum_option_spec_field_id_spec_field_id_fk" FOREIGN KEY ("spec_field_id") REFERENCES "public"."spec_field"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_field_translations" ADD CONSTRAINT "spec_field_translations_spec_field_id_spec_field_id_fk" FOREIGN KEY ("spec_field_id") REFERENCES "public"."spec_field"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_field" ADD CONSTRAINT "spec_field_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_spec_value_translations" ADD CONSTRAINT "product_spec_value_translations_value_id_product_spec_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."product_spec_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_spec_values" ADD CONSTRAINT "product_spec_values_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_spec_values" ADD CONSTRAINT "product_spec_values_spec_field_id_spec_field_id_fk" FOREIGN KEY ("spec_field_id") REFERENCES "public"."spec_field"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_search" ADD CONSTRAINT "product_search_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_translations" ADD CONSTRAINT "recipe_translations_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_translations" ADD CONSTRAINT "industry_translations_industry_id_industry_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_parent_idx" ON "category" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_translations_locale_slug" ON "category_translations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "category_translations_locale_idx" ON "category_translations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "manufacturer_translations_locale_slug" ON "manufacturer_translations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "manufacturer_translations_locale_idx" ON "manufacturer_translations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "product_translations_locale_slug" ON "product_translations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "product_translations_locale_idx" ON "product_translations" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_manufacturer_idx" ON "product" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "spec_field_enum_option_translations_locale_idx" ON "spec_field_enum_option_translations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_field_enum_option_key_idx" ON "spec_field_enum_option" USING btree ("spec_field_id","key");--> statement-breakpoint
CREATE INDEX "spec_field_translations_locale_idx" ON "spec_field_translations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_field_category_key_idx" ON "spec_field" USING btree ("category_id","key");--> statement-breakpoint
CREATE INDEX "spec_field_filter_group_idx" ON "spec_field" USING btree ("filter_group_key");--> statement-breakpoint
CREATE INDEX "psv_field_num_idx" ON "product_spec_values" USING btree ("spec_field_id","num_value");--> statement-breakpoint
CREATE INDEX "psv_field_enum_idx" ON "product_spec_values" USING btree ("spec_field_id","enum_value");--> statement-breakpoint
CREATE INDEX "psv_product_idx" ON "product_spec_values" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_search_tsv_gin" ON "product_search" USING gin ("search_tsv");--> statement-breakpoint
CREATE INDEX "product_search_locale_idx" ON "product_search" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_translations_locale_slug" ON "recipe_translations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "recipe_translations_locale_idx" ON "recipe_translations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "industry_translations_locale_slug" ON "industry_translations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "industry_translations_locale_idx" ON "industry_translations" USING btree ("locale");