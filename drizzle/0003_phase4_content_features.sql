CREATE TABLE "product_industries" (
	"product_id" uuid NOT NULL,
	"industry_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_industries_product_id_industry_id_pk" PRIMARY KEY("product_id","industry_id")
);
--> statement-breakpoint
CREATE TABLE "product_recipes" (
	"product_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_recipes_product_id_recipe_id_pk" PRIMARY KEY("product_id","recipe_id")
);
--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
UPDATE "recipe" SET "status" = CASE WHEN "published_at" IS NOT NULL THEN 'published' ELSE 'draft' END;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_status_check" CHECK ("recipe"."status" IN ('draft','published'));--> statement-breakpoint
ALTER TABLE "industry" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
UPDATE "industry" SET "status" = CASE WHEN "published_at" IS NOT NULL THEN 'published' ELSE 'draft' END;--> statement-breakpoint
ALTER TABLE "industry" ADD CONSTRAINT "industry_status_check" CHECK ("industry"."status" IN ('draft','published'));--> statement-breakpoint
ALTER TABLE "product_industries" ADD CONSTRAINT "product_industries_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_industries" ADD CONSTRAINT "product_industries_industry_id_industry_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_industries_industry_idx" ON "product_industries" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "product_industries_product_idx" ON "product_industries" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_recipes_recipe_idx" ON "product_recipes" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "product_recipes_product_idx" ON "product_recipes" USING btree ("product_id");--> statement-breakpoint
CREATE VIEW "public"."product_used_in_v" AS (
  SELECT pr.product_id,
         'recipe'::text AS content_type,
         r.id AS content_id,
         rt.locale,
         rt.title,
         rt.slug,
         rt.excerpt,
         r.featured_image_public_id,
         pr.position::text AS position
    FROM product_recipes pr
    JOIN recipe r ON r.id = pr.recipe_id
    JOIN recipe_translations rt ON rt.recipe_id = r.id
   WHERE r.status = 'published'
  UNION ALL
  SELECT pi.product_id,
         'industry'::text,
         i.id,
         it.locale,
         it.title,
         it.slug,
         it.excerpt,
         i.featured_image_public_id,
         pi.position::text
    FROM product_industries pi
    JOIN industry i ON i.id = pi.industry_id
    JOIN industry_translations it ON it.industry_id = i.id
   WHERE i.status = 'published'
);
