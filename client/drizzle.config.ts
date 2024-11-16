import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "../shared/database/migrations",
  schema: "../shared/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
