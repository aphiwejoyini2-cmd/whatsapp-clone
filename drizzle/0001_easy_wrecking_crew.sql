CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messaging_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messaging_one_time_prekeys" ALTER COLUMN "id" SET MAXVALUE 9223372036854776000;