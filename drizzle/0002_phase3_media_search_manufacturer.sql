CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "image_public_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "datasheet_public_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "manufacturer" ADD COLUMN "is_official_rep" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "manufacturer_translations" ADD COLUMN "relationship_note" text;
