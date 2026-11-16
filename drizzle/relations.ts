import { relations } from "drizzle-orm/relations";
import { messagingDevices, messagingOneTimePrekeys, usersInAuth, messagingConversations, messagingMessages, messagingProfiles } from "./schema";

export const messagingOneTimePrekeysRelations = relations(messagingOneTimePrekeys, ({one}) => ({
	messagingDevice: one(messagingDevices, {
		fields: [messagingOneTimePrekeys.userId],
		references: [messagingDevices.userId]
	}),
}));

export const messagingDevicesRelations = relations(messagingDevices, ({one, many}) => ({
	messagingOneTimePrekeys: many(messagingOneTimePrekeys),
	usersInAuth: one(usersInAuth, {
		fields: [messagingDevices.userId],
		references: [usersInAuth.id]
	}),
}));

export const messagingConversationsRelations = relations(messagingConversations, ({one, many}) => ({
	usersInAuth_userA: one(usersInAuth, {
		fields: [messagingConversations.userA],
		references: [usersInAuth.id],
		relationName: "messagingConversations_userA_usersInAuth_id"
	}),
	usersInAuth_userB: one(usersInAuth, {
		fields: [messagingConversations.userB],
		references: [usersInAuth.id],
		relationName: "messagingConversations_userB_usersInAuth_id"
	}),
	messagingMessages: many(messagingMessages),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	messagingConversations_userA: many(messagingConversations, {
		relationName: "messagingConversations_userA_usersInAuth_id"
	}),
	messagingConversations_userB: many(messagingConversations, {
		relationName: "messagingConversations_userB_usersInAuth_id"
	}),
	messagingMessages_recipientId: many(messagingMessages, {
		relationName: "messagingMessages_recipientId_usersInAuth_id"
	}),
	messagingMessages_senderId: many(messagingMessages, {
		relationName: "messagingMessages_senderId_usersInAuth_id"
	}),
	messagingProfiles: many(messagingProfiles),
	messagingDevices: many(messagingDevices),
}));

export const messagingMessagesRelations = relations(messagingMessages, ({one}) => ({
	messagingConversation: one(messagingConversations, {
		fields: [messagingMessages.conversationId],
		references: [messagingConversations.id]
	}),
	usersInAuth_recipientId: one(usersInAuth, {
		fields: [messagingMessages.recipientId],
		references: [usersInAuth.id],
		relationName: "messagingMessages_recipientId_usersInAuth_id"
	}),
	usersInAuth_senderId: one(usersInAuth, {
		fields: [messagingMessages.senderId],
		references: [usersInAuth.id],
		relationName: "messagingMessages_senderId_usersInAuth_id"
	}),
}));

export const messagingProfilesRelations = relations(messagingProfiles, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [messagingProfiles.userId],
		references: [usersInAuth.id]
	}),
}));