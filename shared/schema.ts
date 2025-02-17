import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  points: integer("points").notNull().default(0),
});

// Rooms Table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .references(() => users.id, { onDelete: "cascade" }) // ✅ Add cascade
    .notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  isPrivate: true,
});

// TypeScript Type Definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

// ✅ Alternative if `.inferSelect` causes issues:
import { InferSelectModel } from "drizzle-orm";
export type User = InferSelectModel<typeof users>;
export type Room = InferSelectModel<typeof rooms>;

// WebSocket Message Type
export type WebSocketMessage = 
  | { type: "join_room"; roomId: number }
  | { type: "leave_room"; roomId: number }
  | { type: "offer"; target: number; offer: RTCSessionDescriptionInit }
  | { type: "answer"; target: number; answer: RTCSessionDescriptionInit }
  | { type: "ice_candidate"; target: number; candidate: RTCIceCandidate }
  | { type: "chat_message"; roomId: number; message: string }
  | { type: "room_users"; roomId: number; users: User[] }
  | { type: "error"; message: string };  // Added error type for handling error messages


