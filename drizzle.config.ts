import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" })  // ✅ Automatically loads .env from root


import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is missing. Make sure the database is running.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
