import { Hashtable } from "./util"
import { Biome, Tile } from "./objects"
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

export function isNavigable(tile: Tile): boolean {
  switch (tile.biome) {
    case Biome.None:
    case Biome.Ocean:
    case Biome.Shore:
    case Biome.River:
    return false
    default:
    return true
  }
}

export enum TransferDirection {
  tile,
  group,
}
