import { World } from "../../shared/objects"
import Tile from "../../shared/tile"
import { Hashtable } from "../../shared/util"

export function create(tiles: Hashtable<Tile>): World {
  return {
    tiles: tiles,
    groups: [],
    units: [],
    buildings: [],
    playerRelations: {},
    battles: [],
  }
}
