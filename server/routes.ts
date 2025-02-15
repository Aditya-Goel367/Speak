import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "../Database/storage";
import { insertRoomSchema, type WebSocketMessage, type User } from "@shared/schema";
import { z } from "zod";

const connections = new Map<number, WebSocket>();
const rooms = new Map<number, Set<number>>();

export async function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.post("/api/rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const parsed = insertRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error);
    
    const room = await storage.createRoom({
      ...parsed.data,
      ownerId: req.user.id,
    });
    res.json(room);
  });

  app.get("/api/rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rooms = await storage.getRooms();
    res.json(rooms);
  });

  app.get("/api/rooms/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.sendStatus(400);
    
    const room = await storage.getRoom(id);
    if (!room) return res.sendStatus(404);
    
    res.json(room);
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    if (!req.url) return ws.close();
    
    const userId = parseInt(new URL(req.url, "http://localhost").searchParams.get("userId") || "");
    if (isNaN(userId)) return ws.close();
    
    const user = await storage.getUser(userId);
    if (!user) return ws.close();
    
    connections.set(userId, ws);
    
    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as WebSocketMessage;
        
        switch (msg.type) {
          case "join_room": {
            const room = await storage.getRoom(msg.roomId);
            if (!room) return;
            
            if (!rooms.has(msg.roomId)) {
              rooms.set(msg.roomId, new Set());
            }
            rooms.get(msg.roomId)!.add(userId);
            
            const users = await Promise.all(
              Array.from(rooms.get(msg.roomId)!).map(id => storage.getUser(id))
            );
            
            broadcast(msg.roomId, {
              type: "room_users",
              roomId: msg.roomId,
              users: users.filter((u): u is User => !!u)
            });
            break;
          }
          
          case "leave_room": {
            if (!rooms.has(msg.roomId)) return;
            rooms.get(msg.roomId)!.delete(userId);
            if (rooms.get(msg.roomId)!.size === 0) {
              rooms.delete(msg.roomId);
            }
            break;
          }
          
          case "offer":
          case "answer":
          case "ice_candidate": {
            const targetWs = connections.get(msg.target);
            if (targetWs?.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify(msg));
            }
            break;
          }
          
          case "chat_message": {
            broadcast(msg.roomId, msg);
            break;
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    ws.on("close", () => {
      connections.delete(userId);
      for (const [roomId, users] of rooms.entries()) {
        if (users.has(userId)) {
          users.delete(userId);
          if (users.size === 0) {
            rooms.delete(roomId);
          }
        }
      }
    });
  });

  return httpServer;
}

function broadcast(roomId: number, msg: WebSocketMessage) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  for (const userId of room) {
    const ws = connections.get(userId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}
