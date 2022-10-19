import { Hashtable } from "./util"
import { Tile } from "./objects"
import Hex, { hash } from "./hex"

export function getTileByPos(pos: Hex, tiles: Hashtable<Tile>) {
  return tiles[hash(pos)]
}

export function getTileById(id: number, tiles: Hashtable<Tile>): Tile | null {
  for (const tile of Object.values(tiles)) {
    if (tile.id === id) {
      return tile
    }
  }
  return null
}

export enum TransferDirection {
  tile,
  group,
}
