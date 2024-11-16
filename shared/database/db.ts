import { User, userTable } from "./schema"
import path from "node:path"
import * as schema from "./schema"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator"
import { Client } from "pg"
import { eq } from "drizzle-orm"

let dbInstance: ReturnType<typeof drizzlePg> | null = null

export async function DB() {
  if (dbInstance) return dbInstance

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  await client.connect()

  dbInstance = drizzlePg(client, { schema })
  await migratePg(dbInstance, {
    migrationsFolder: path.join(process.cwd(), "../shared/database/migrations"),
  })
  return dbInstance
}

export async function getUserByGoogleId(
  googleId: string
): Promise<User | null> {
  const db = await DB()
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
  const db = await DB()
  const result = await db
    .insert(userTable)
    .values({
      googleId,
      name,
    })
    .returning()

  return result[0]
}
