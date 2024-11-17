import { Tile, World } from "../../shared/objects.js"
import { Hashtable } from "../../shared/util.js"

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
  }
}
