import dotenv from "dotenv";
dotenv.config(); // Ensure environment variables are loaded

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "../server/storage"; // Correct import for sessionStore
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Hash the user's password with a salt
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare provided password with stored hash
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Ensure SESSION_SECRET is set
  const sessionSecret = process.env.SESSION_SECRET || "default_secret";

  // Ensure session store is initialized
  if (!storage.sessionStore) {
    throw new Error("Session store is not defined. Check storage.ts");
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore, // Use the session store from storage.ts
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,
      sameSite: "lax",
    },
  };

  // Setup middleware for sessions and passport
  app.set("trust proxy", 1); // For secure cookies in reverse proxies
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // LocalStrategy for authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user information into the session
  passport.serializeUser((user, done) => done(null, user.id));
  
  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Register API
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Login API
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || "Unauthorized" });

      req.login(user, async (err) => {
        if (err) return next(err);
        try {
          await storage.sendLoginNotification(user.username);
        } catch (error) {
          console.error("Failed to send login notification:", error);
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  // Logout API
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get Current User API
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json(req.user);
  });
}
