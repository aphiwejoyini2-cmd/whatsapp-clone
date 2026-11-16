-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "messaging_one_time_prekeys" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "messaging_one_time_prekeys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"key_id" integer NOT NULL,
	"public_key" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "messaging_one_time_prekeys_user_id_device_id_key_id_key" UNIQUE("user_id","device_id","key_id")
);
--> statement-breakpoint
ALTER TABLE "messaging_one_time_prekeys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_conversations_user_a_user_b_key" UNIQUE("user_a","user_b"),
	CONSTRAINT "messaging_conversations_ordered_users" CHECK (user_a < user_b)
);
--> statement-breakpoint
ALTER TABLE "messaging_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"sender_device_id" text NOT NULL,
	"recipient_device_id" text NOT NULL,
	"one_time_prekey_id" integer,
	"ephemeral_public_key" jsonb NOT NULL,
	"salt" text NOT NULL,
	"nonce" text NOT NULL,
	"ciphertext" text NOT NULL,
	"signature" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_messages_distinct_users" CHECK (sender_id <> recipient_id)
);
--> statement-breakpoint
ALTER TABLE "messaging_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"phone_e164" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email_normalized" text,
	CONSTRAINT "messaging_profiles_phone_e164_key" UNIQUE("phone_e164"),
	CONSTRAINT "messaging_profiles_email_normalized_key" UNIQUE("email_normalized")
);
--> statement-breakpoint
ALTER TABLE "messaging_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_devices" (
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"identity_key" jsonb NOT NULL,
	"signed_prekey" jsonb NOT NULL,
	"signed_prekey_signature" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_devices_pkey" PRIMARY KEY("user_id","device_id")
);
--> statement-breakpoint
ALTER TABLE "messaging_devices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messaging_one_time_prekeys" ADD CONSTRAINT "messaging_one_time_prekeys_user_id_device_id_fkey" FOREIGN KEY ("user_id","device_id") REFERENCES "public"."messaging_devices"("user_id","device_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_user_a_fkey" FOREIGN KEY ("user_a") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_user_b_fkey" FOREIGN KEY ("user_b") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."messaging_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_profiles" ADD CONSTRAINT "messaging_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_devices" ADD CONSTRAINT "messaging_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messaging_prekeys_available_idx" ON "messaging_one_time_prekeys" USING btree ("user_id" int8_ops,"device_id" int8_ops,"id" int8_ops) WHERE (claimed_at IS NULL);--> statement-breakpoint
CREATE INDEX "messaging_messages_conversation_created_idx" ON "messaging_messages" USING btree ("conversation_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE POLICY "Users can add their own prekeys" ON "messaging_one_time_prekeys" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));--> statement-breakpoint
CREATE POLICY "Users can view public prekeys" ON "messaging_one_time_prekeys" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "Users can read their conversations" ON "messaging_conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.uid() = user_a) OR (auth.uid() = user_b)));--> statement-breakpoint
CREATE POLICY "Senders can add encrypted messages" ON "messaging_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM messaging_conversations c
  WHERE ((c.id = messaging_messages.conversation_id) AND ((auth.uid() = c.user_a) OR (auth.uid() = c.user_b)) AND ((messaging_messages.recipient_id = c.user_a) OR (messaging_messages.recipient_id = c.user_b)) AND (messaging_messages.sender_id <> messaging_messages.recipient_id))))));--> statement-breakpoint
CREATE POLICY "Participants can read encrypted messages" ON "messaging_messages" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "Users can manage their own devices" ON "messaging_devices" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));--> statement-breakpoint
CREATE POLICY "Users can view public device keys" ON "messaging_devices" AS PERMISSIVE FOR SELECT TO "authenticated";
*/