import { Hashtable } from "./util.js"
import PlayerRelation from "./relation.js"
import { Player } from "./player.js"
import { Hex } from "./hex.js"
import { Resources } from "./resources.js"

export type UserId = string

// World
export type World = {
  idCounter: number
  players: Hashtable<Player>
  tiles: Hashtable<Tile>
  groups: Hashtable<Group>
  buildings: Hashtable<Building>
  playerRelations: Hashtable<PlayerRelation>
  battles: Battle[]
}

// Game Objects
export type GameObject = {
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
export type Tile = GameObject & {
  precipitation: number
  biome: Biome
  hex: Hex
  height: number
  resources: Partial<Resources>
  temperature: number
}

export type Ownable = {
  owner: UserId
}

export type Battle = GameObject & {
  attacker: Group
  defender: Group
  position: Hex
}

// Resource slot for a building
export type ResourceSlot = {
  resourceType: keyof Resources
  assignedGroupId?: number
  efficiency: number // Base efficiency of this slot (1.0 = 100%)
}

export type Building = GameObject &
  Ownable & {
    position: Hex
    key: string
    spotting: number
    production: Resources
    level: number
    slots: ResourceSlot[] // Slots for group assignment
    maxLevel: number // Maximum level this building can be upgraded to
    upgradeRequirements?: Partial<Resources> // Resources needed for next upgrade
  }

export type Group = GameObject &
  Ownable & {
    name: string
    spotting: number
    targetHexes: Hex[]
    pos: Hex
    movementStatus: number
    resources: Partial<Resources>
    assignedToBuilding?: number // ID of building this group is assigned to
    assignedToSlot?: number // Index of the slot in the building

    // Resource gathering stats
    gatheringEfficiency: {
      wood: number
      stone: number
      food: number
      iron: number
      gold: number
    }

    // Stats
    morale: number
    strength: number
    endurance: number

    // Combat stats
    attack: number
    defense: number

    // Type of group (for visual representation)
    groupType: string
  }

export type TBuildingTemplate = {
  key: string
  name: string
  cost: Partial<Resources>
  spotting: number
  production: Partial<Resources>
  slots?: ResourceSlot[]
  maxLevel?: number
  upgrades?: {
    [level: number]: {
      cost: Partial<Resources>
      production: Partial<Resources>
      slots: ResourceSlot[]
      spotting: number
    }
  }
}
