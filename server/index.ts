
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  const start = Date.now();
  let capturedResponse: Record<string, any> | undefined;

  const originalJson = res.json;
  res.json = function(body, ...args) {
    capturedResponse = body;
    return originalJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logMessage = formatLogMessage(req.method, req.path, res.statusCode, duration, capturedResponse);
    log(logMessage);
  });

  next();
}

function formatLogMessage(method: string, path: string, status: number, duration: number, response?: Record<string, any>) {
  let message = `${method} ${path} ${status} in ${duration}ms`;
  if (response) {
    message += ` :: ${JSON.stringify(response)}`;
  }
  return message.length > 80 ? message.slice(0, 79) + "…" : message;
}

app.use(loggingMiddleware);

// Server setup
(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 2000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
