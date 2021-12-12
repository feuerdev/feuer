import { Hashtable } from "./util"
import { Tile } from "./objects"

export function getTileById(id: number, tiles: Hashtable<Tile>): Tile | null {
  for (const [k, v] of Object.entries(tiles)) {
    if (v.id === id) {
      return v
    }
  }
  return null
}
