CREATE TABLE "contact_rate_limit" (
	"ip_hash" text NOT NULL,
	"window_kind" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "contact_rate_limit_ip_hash_window_kind_window_start_pk" PRIMARY KEY("ip_hash","window_kind","window_start"),
	CONSTRAINT "contact_rate_limit_window_kind_check" CHECK ("contact_rate_limit"."window_kind" IN ('hour','day'))
);
--> statement-breakpoint
CREATE INDEX "contact_rate_limit_cleanup_idx" ON "contact_rate_limit" USING btree ("window_start");