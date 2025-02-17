import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../server/db"; // Ensure this correctly imports your DB pool

const PgSession = connectPgSimple(session);

class Storage {
  sessionStore: session.Store;
  createRoom: any;
  getRooms: any;
  getRoom: any;
  getUser: any;
  getActiveUsers: any;

  constructor() {
    // Ensure DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing in .env");
    }

    // Initialize session store with PostgreSQL
    this.sessionStore = new PgSession({
      pool, // Uses existing PostgreSQL connection
      tableName: "session", // You can change this table name
    });
  }

  async sendLoginNotification(username: string) {
    console.log(`Login notification would be sent to ${username}`);
  }
}

export const storage = new Storage();
