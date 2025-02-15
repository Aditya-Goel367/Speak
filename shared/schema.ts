import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {

  points: integer("points").notNull().default(0),

  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .references(() => users.id)
    .notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  isPrivate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type User = typeof users.$inferSelect;
export type Room = typeof rooms.$inferSelect;

export type WebSocketMessage = 
  | { type: "join_room"; roomId: number }
  | { type: "leave_room"; roomId: number }
  | { type: "offer"; target: number; offer: RTCSessionDescriptionInit }
  | { type: "answer"; target: number; answer: RTCSessionDescriptionInit }
  | { type: "ice_candidate"; target: number; candidate: RTCIceCandidate }
  | { type: "chat_message"; roomId: number; message: string }
  | { type: "room_users"; roomId: number; users: User[] };
