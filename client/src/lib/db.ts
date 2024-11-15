import pg from "pg";
import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import type { InferSelectModel } from "drizzle-orm";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool);

export const userTable = pgTable("user", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").unique(),
  name: text("name"),
});

export const sessionTable = pgTable("session", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export async function getUserFromGoogleId(
  googleId: string
): Promise<User | null> {
  const result = await db
    .select()
    .from(userTable)
    .where(eq(userTable.googleId, googleId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createUser(
  googleId: string,
  name: string
): Promise<User> {
  const result = await db
    .insert(userTable)
    .values({
      googleId,
      name,
    })
    .returning();

  return result[0];
}

export type User = InferSelectModel<typeof userTable>;
export type Session = InferSelectModel<typeof sessionTable>;
