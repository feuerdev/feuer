import { Hashtable } from "./util.js"
import { Biome, Group, Tile } from "./objects.js"
import { hash, Hex } from "./hex.js"
import { Resources } from "./resources.js"

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

export function canFight(group: Group): boolean {
  return group.morale > 0
}

export function subtractResources(tile: Tile, resources: Partial<Resources>) {
  for (const res of Object.keys(resources) as Array<keyof Resources>) {
    tile.resources[res]! -= resources[res]!
  }
}

export enum TransferDirection {
  tile,
  group,
}
