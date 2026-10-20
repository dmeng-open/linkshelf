CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE INDEX "links_tags_gin_idx" ON "links" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "links_created_at_id_idx" ON "links" USING btree ("created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);