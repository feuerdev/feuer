import { Hashtable } from "./util"
import Hex from "./hex"
import PlayerRelation from "./relation"
import Resources from "./resources"
import Player from "./player"

export type UserId = string

// World
export interface World {
  idCounter: number
  players: Hashtable<Player>
  tiles: Hashtable<Tile>
  groups: Hashtable<Group>
  units: Unit[]
  buildings: Building[]
  playerRelations: Hashtable<PlayerRelation>
  battles: Battle[]
}

// Game Objects
export interface GameObject {
  id: number
}

export enum Biome {
  None,
  Ice,
  Tundra,
  Boreal,
  Temperate,
  Tropical,
  Grassland,
  Desert,
  Ocean,
  Shore,
  Treeline,
  Mountain,
  Beach,
  Peaks,
  River,
}

/**
 * Tile-Class representing one hex with all its relevant fields
 */
export interface Tile extends GameObject {
  precipitation: number
  biome: Biome
  hex: Hex
  height: number
  resources: Resources
  temperature: number
}

export interface Battle extends GameObject {
  attacker: Group
  defender: Group
  position: Hex
}

export interface Building extends GameObject {
  owner: UserId
  position: Hex
  type: string
  level: number
  spotting: number
  hp: number
  resourceGeneration: Resources
}

export interface Group extends GameObject {
  owner: string
  spotting: number
  targetHexes: Hex[]
  pos: Hex
  movementStatus: number
  units: Unit[]
  resources: Resources
}

export interface Unit extends GameObject {
  owner: UserId
  name: string

  //Character Traits (Can only slightly be altered):
  //Leadership:
  leadership: number
  courage: number
  tactics: number
  teacher: number

  //Personal:
  agressiveness: number

  //Physical:
  height: number
  weight: number

  //Character Skills (Can be trained):
  //Combat:
  sword: number
  spear: number
  bow: number
  dodging: number

  //Physical:
  strength: number
  endurance: number

  //Experience:
  experience_theory: number
  experience_combat: number
}
