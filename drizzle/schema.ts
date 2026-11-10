import { pgTable, pgSchema, index, foreignKey, unique, pgPolicy, bigint, uuid, text, integer, jsonb, timestamp, check, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const usersInAuth = pgSchema("auth").table("users", {
	id: uuid("id").primaryKey(),
});


export const messagingOneTimePrekeys = pgTable("messaging_one_time_prekeys", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "messaging_one_time_prekeys_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	userId: uuid("user_id").notNull(),
	deviceId: text("device_id").notNull(),
	keyId: integer("key_id").notNull(),
	publicKey: jsonb("public_key").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	claimedAt: timestamp("claimed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("messaging_prekeys_available_idx").using("btree", table.userId.asc().nullsLast().op("int8_ops"), table.deviceId.asc().nullsLast().op("int8_ops"), table.id.asc().nullsLast().op("int8_ops")).where(sql`(claimed_at IS NULL)`),
	foreignKey({
			columns: [table.userId, table.deviceId],
			foreignColumns: [messagingDevices.userId, messagingDevices.deviceId],
			name: "messaging_one_time_prekeys_user_id_device_id_fkey"
		}).onDelete("cascade"),
	unique("messaging_one_time_prekeys_user_id_device_id_key_id_key").on(table.userId, table.deviceId, table.keyId),
	pgPolicy("Users can add their own prekeys", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(auth.uid() = user_id)`  }),
	pgPolicy("Users can view public prekeys", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const messagingConversations = pgTable("messaging_conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userA: uuid("user_a").notNull(),
	userB: uuid("user_b").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userA],
			foreignColumns: [usersInAuth.id],
			name: "messaging_conversations_user_a_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userB],
			foreignColumns: [usersInAuth.id],
			name: "messaging_conversations_user_b_fkey"
		}).onDelete("cascade"),
	unique("messaging_conversations_user_a_user_b_key").on(table.userA, table.userB),
	pgPolicy("Users can read their conversations", { as: "permissive", for: "select", to: ["authenticated"], using: sql`((auth.uid() = user_a) OR (auth.uid() = user_b))` }),
	check("messaging_conversations_ordered_users", sql`user_a < user_b`),
]);

export const messagingMessages = pgTable("messaging_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	senderId: uuid("sender_id").notNull(),
	recipientId: uuid("recipient_id").notNull(),
	senderDeviceId: text("sender_device_id").notNull(),
	recipientDeviceId: text("recipient_device_id").notNull(),
	oneTimePrekeyId: integer("one_time_prekey_id"),
	ephemeralPublicKey: jsonb("ephemeral_public_key").notNull(),
	salt: text().notNull(),
	nonce: text().notNull(),
	ciphertext: text().notNull(),
	signature: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("messaging_messages_conversation_created_idx").using("btree", table.conversationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [messagingConversations.id],
			name: "messaging_messages_conversation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [usersInAuth.id],
			name: "messaging_messages_recipient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [usersInAuth.id],
			name: "messaging_messages_sender_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Senders can add encrypted messages", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM messaging_conversations c
  WHERE ((c.id = messaging_messages.conversation_id) AND ((auth.uid() = c.user_a) OR (auth.uid() = c.user_b)) AND ((messaging_messages.recipient_id = c.user_a) OR (messaging_messages.recipient_id = c.user_b)) AND (messaging_messages.sender_id <> messaging_messages.recipient_id)))))`  }),
	pgPolicy("Participants can read encrypted messages", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("messaging_messages_distinct_users", sql`sender_id <> recipient_id`),
]);

export const messagingProfiles = pgTable("messaging_profiles", {
	userId: uuid("user_id").primaryKey().notNull(),
	phoneE164: text("phone_e164"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	emailNormalized: text("email_normalized"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "messaging_profiles_user_id_fkey"
		}).onDelete("cascade"),
	unique("messaging_profiles_phone_e164_key").on(table.phoneE164),
	unique("messaging_profiles_email_normalized_key").on(table.emailNormalized),
]);

export const messagingDevices = pgTable("messaging_devices", {
	userId: uuid("user_id").notNull(),
	deviceId: text("device_id").notNull(),
	identityKey: jsonb("identity_key").notNull(),
	signedPrekey: jsonb("signed_prekey").notNull(),
	signedPrekeySignature: text("signed_prekey_signature").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "messaging_devices_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.deviceId], name: "messaging_devices_pkey"}),
	pgPolicy("Users can manage their own devices", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(auth.uid() = user_id)`, withCheck: sql`(auth.uid() = user_id)`  }),
	pgPolicy("Users can view public device keys", { as: "permissive", for: "select", to: ["authenticated"] }),
]);
