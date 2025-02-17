import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "../Database/storage";
import { insertRoomSchema, type WebSocketMessage, type User } from "@shared/schema";

class WebSocketManager {
  private connections = new Map<number, WebSocket>();
  private rooms = new Map<number, Set<number>>();
  getRoomUsers: any;

  addConnection(userId: number, ws: WebSocket) {
    this.connections.set(userId, ws);
  }

  removeConnection(userId: number) {
    this.connections.delete(userId);
    for (const [roomId, users] of this.rooms.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        if (users.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }
  }

  joinRoom(roomId: number, userId: number) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(userId);
  }

  leaveRoom(roomId: number, userId: number) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  broadcast(roomId: number, message: WebSocketMessage) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const userId of room) {
      const ws = this.connections.get(userId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  sendToUser(userId: number, message: WebSocketMessage) {
    const ws = this.connections.get(userId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  setupHttpRoutes(app);
  return setupWebSocket(app);
}

function setupHttpRoutes(app: Express) {
  app.post("/api/rooms", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error);

    const room = await storage.createRoom({
      ...parsed.data,
      ownerId: req.user.id,
    });
    res.json(room);
  });

  app.get("/api/rooms", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rooms = await storage.getRooms();
    res.json(rooms);
  });

  app.get("/api/rooms/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.sendStatus(400);

    const room = await storage.getRoom(id);
    if (!room) return res.sendStatus(404);

    res.json(room);
  });
}

function setupWebSocket(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const wsManager = new WebSocketManager();

  wss.on("connection", handleWebSocketConnection(wsManager));

  return httpServer;
}

function handleWebSocketConnection(wsManager: WebSocketManager) {
  return async (ws: WebSocket, req: any) => {
    if (!req.url) return ws.close();

    const isAnonymous = req.url.includes("anonymous=true");
    let userId: number | string = isAnonymous
      ? `anonymous_${Date.now()}`
      : parseInt(new URL(req.url, "http://localhost").searchParams.get("userId") || "");

    if (!isAnonymous && isNaN(userId as number)) return ws.close();

    const user = await storage.getUser(userId);
    if (!user) return ws.close();

    wsManager.addConnection(userId as number, ws);

    ws.on("message", (data) => handleWebSocketMessage(wsManager, userId as number, data));
    ws.on("close", () => wsManager.removeConnection(userId as number));
  };
}

function handleWebSocketMessage(wsManager: WebSocketManager, userId: number, data: any) {
  try {
    const msg = JSON.parse(data.toString()) as WebSocketMessage;

    switch (msg.type) {
      case "join_room":
        handleJoinRoom(wsManager, msg.roomId, userId);
        break;
      case "leave_room":
        wsManager.leaveRoom(msg.roomId, userId);
        break;
      case "offer":
      case "answer":
      case "ice_candidate":
        wsManager.sendToUser(msg.target, msg);
        break;
      case "chat_message":
        wsManager.broadcast(msg.roomId, msg);
        break;
      case "error":
        // Handle error message
        console.error(`Error message: ${msg.message}`);
        break;
    }
  } catch (e) {
    console.error(e);
  }
}

async function handleJoinRoom(wsManager: WebSocketManager, roomId: number, userId: number) {
  const room = await storage.getRoom(roomId);
  if (!room) return;

  wsManager.joinRoom(roomId, userId);

  const users = await Promise.all(
    Array.from(wsManager.getRoomUsers(roomId) || []).map((id) => storage.getUser(id))
  );

  wsManager.broadcast(roomId, {
    type: "room_users",
    roomId,
    users: users.filter((u): u is User => !!u),
  });
}

async function findMatchingUser(userId: number): Promise<User | null> {
  const currentUser = await storage.getUser(userId);
  if (!currentUser) return null;

  const users = await storage.getActiveUsers();
  return (
    users.find(
      (u) => u.id !== userId && Math.abs((u.points || 0) - (currentUser.points || 0)) < 100
    ) || null
  );
}

async function getBotResponse(message: string): Promise<string> {
  const responses = [
    "That's interesting! Tell me more.",
    "I understand what you mean.",
    "How does that make you feel?",
    "Let's explore that topic further.",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
