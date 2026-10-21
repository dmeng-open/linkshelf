CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "login_failures" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client" text NOT NULL,
	"failed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "login_failures_client_failed_at_idx" ON "login_failures" USING btree ("client","failed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "links_unread_created_at_id_idx" ON "links" USING btree ("created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "links"."read_at" is null;--> statement-breakpoint
CREATE INDEX "links_title_trgm_idx" ON "links" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "links_url_trgm_idx" ON "links" USING gin ("url" gin_trgm_ops);