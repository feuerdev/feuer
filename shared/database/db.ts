import { User, userTable } from "./schema"
import path from "node:path"
import * as schema from "./schema"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator"
import { Client } from "pg"
import { eq } from "drizzle-orm"

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})
await client.connect()

export const db = drizzlePg(client, { schema })

await migratePg(db, {
  migrationsFolder: path.join(process.cwd(), "../shared/database/migrations"),
})

export async function getUserByGoogleId(
  googleId: string
): Promise<User | null> {
  const result = await db
    .select()
    .from(userTable)
    .where(eq(userTable.googleId, googleId))
    .limit(1)

  return result.length > 0 ? result[0] : null
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
    .returning()

  return result[0]
}
