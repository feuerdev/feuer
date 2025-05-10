import { Tile, World } from "../../shared/objects.js";
import { Hashtable } from "../../shared/util.js";
import Config from "./environment.js";
import {
  initDatabase,
  loadWorldFromDb,
  saveWorldToDb,
  listWorldsFromDb,
} from "./db.js";

export function create(tiles: Hashtable<Tile>): World {
  return {
    idCounter: -1,
    players: {},
    tiles: tiles,
    groups: {},
    units: [],
    buildings: {},
    playerRelations: {},
    battles: [],
  };
}

export async function saveWorld(world: World): Promise<boolean> {
  const worldName = Config.worldName;
  return await saveWorldToDb(world, worldName);
}

export async function loadWorld(): Promise<World | null> {
  const worldName = Config.worldName;
  return await loadWorldFromDb(worldName);
}

export async function listWorlds(): Promise<string[]> {
  return await listWorldsFromDb();
}

// Re-export initDatabase for backward compatibility
export { initDatabase };
