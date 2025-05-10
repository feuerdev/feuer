import { World } from "../../shared/objects.js";
import Config from "./environment.js";
import pg from "pg";

// Extract Pool from pg module
const { Pool } = pg;

// Create a connection pool
let pool: any = null;

if (Config.dbConnectionString) {
  pool = new Pool({
    connectionString: Config.dbConnectionString,
  });
}

export async function initDatabase(): Promise<boolean> {
  if (!pool) return false;

  try {
    const client = await pool.connect();
    try {
      // Create table if it doesn't exist with name as primary key
      await client.query(`
        CREATE TABLE IF NOT EXISTS world_state (
          name TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.info("Database initialized");
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to initialize database:", err);
    return false;
  }
}

export async function saveWorldToDb(
  world: World,
  worldName: string
): Promise<boolean> {
  if (!pool) return false;

  console.info(`Saving world: ${worldName}`);

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Store world data as JSON
      const worldData = JSON.stringify(world);

      // Check if world_metadata table exists, create if it doesn't
      await ensureMetadataTable(client);

      // Upsert the world data - updates if exists, inserts if not
      await client.query(
        `INSERT INTO world_state (name, data) 
         VALUES ($1, $2) 
         ON CONFLICT (name) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        [worldName, worldData]
      );

      await client.query("COMMIT");
      console.info(`World state saved to database with name: ${worldName}`);
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Failed to save world:", err);
      return false;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database connection error:", err);
    return false;
  }
}

export async function loadWorldFromDb(
  worldName: string
): Promise<World | null> {
  if (!pool) return null;

  console.info(`Loading world: ${worldName}`);

  try {
    const client = await pool.connect();
    try {
      // Check if world_metadata table exists, create if it doesn't
      await ensureMetadataTable(client);

      // Get the specified world by name
      const result = await client.query(
        "SELECT data FROM world_state WHERE name = $1",
        [worldName]
      );

      if (result.rows.length > 0) {
        console.info(`World state "${worldName}" loaded from database`);

        // Fix for PostgreSQL JSONB handling
        // PostgreSQL may return the data already parsed as a JS object
        const data = result.rows[0].data;
        return typeof data === "string" ? JSON.parse(data) : data;
      } else {
        console.info(`No saved world state found with name: ${worldName}`);
        return null;
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to load world:", err);
    return null;
  }
}

export async function listWorldsFromDb(): Promise<string[]> {
  if (!pool) return [];

  try {
    const client = await pool.connect();
    try {
      // Check if world_metadata table exists, create if it doesn't
      await ensureMetadataTable(client);

      const result = await client.query(
        "SELECT name FROM world_state ORDER BY updated_at DESC"
      );

      return result.rows.map((row) => row.name);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to list worlds:", err);
    return [];
  }
}

// Helper function to ensure metadata table exists
async function ensureMetadataTable(client: any): Promise<void> {
  // Migration: Check if the old table with id as primary key exists
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'world_state'
    )
  `);

  if (tableCheck.rows[0].exists) {
    // Check if the table has the name column
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'world_state' AND column_name = 'name'
      )
    `);

    if (!columnCheck.rows[0].exists) {
      // Migrate old table structure to new one
      console.info("Migrating world_state table to support named worlds");
      await client.query(`
        ALTER TABLE world_state 
        ADD COLUMN name TEXT DEFAULT 'default'
      `);

      // Set name column as primary key
      await client.query(`
        ALTER TABLE world_state 
        DROP CONSTRAINT IF EXISTS world_state_pkey,
        ADD PRIMARY KEY (name)
      `);
    }
  } else {
    // Create the table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS world_state (
        name TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  }
}
