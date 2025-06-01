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
    level: number
    slots: ResourceSlot[] // Slots for group assignment
    maxLevel: number // Maximum level this building can be upgraded to
    upgradeRequirements?: Partial<Resources> // Resources needed for next upgrade
    // Optional defensive stats
    attack?: number
    defense?: number
    range?: number
    attackSpeed?: number // Attacks per game update cycle (e.g., 1 = every update, 0.5 = every other update)
    timeToNextAttack?: number // Internal cooldown counter
    isDefensive?: boolean // Whether this building provides defense to the tile
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
    initiative: number
    agility: number
    painThreshold: number
    intelligence: number

    // Type of group (for visual representation)
    groupType: string

    // Behavior
    behavior: GroupBehavior

    // For virtual groups (like tile defenses)
    isVirtual?: boolean
  }

export enum GroupBehavior {
  Aggressive,
  FleeIfAttacked, // Renamed from Evasive for clarity
  Neutral, // Default, no specific combat behavior, relies on direct orders
}

export type TBuildingTemplate = {
  key: string
  name: string
  cost: Partial<Resources>
  spotting: number
  slots?: ResourceSlot[]
  maxLevel?: number
  // Optional defensive stats for templates
  attack?: number
  defense?: number
  range?: number
  attackSpeed?: number
  isDefensive?: boolean
  upgrades?: {
    [level: number]: {
      cost: Partial<Resources>
      slots?: ResourceSlot[] // Slots can be optional for some buildings like watchtowers
      spotting: number
      // Optional defensive stats for upgrades
      attack?: number
      defense?: number
      range?: number
      attackSpeed?: number
      name?: string // Optional name change on upgrade (e.g., "Wooden Palisade" -> "Stone Wall")
    }
  }
}

// Add the SelectionType enum here
export const enum SelectionType {
  None = 0,
  Group = 1,
  Tile = 2,
  Building = 3,
  Battle = 4,
}

export function getSelectionTypeName(selectionType: SelectionType): string {
  switch (selectionType) {
    case SelectionType.None:
      return "None"
    case SelectionType.Group:
      return "Group"
    case SelectionType.Tile:
      return "Tile"
    case SelectionType.Building:
      return "Building"
    case SelectionType.Battle:
      return "Battle"
    default:
      return "Unknown"
  }
}
