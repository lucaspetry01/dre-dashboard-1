import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { ENV } from "./server/_core/env";

const connectionString = ENV.databaseUrl;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
