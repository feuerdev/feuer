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
  units: Unit[]
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
  duels: Duel[]
}

export type Duel = {
  attacker: FightingUnit
  defender: FightingUnit
  over: boolean
}

export type Building = GameObject &
  Ownable & {
    position: Hex
    key: string
    spotting: number
    production: Resources
  }

export type Group = GameObject &
  Ownable & {
    spotting: number
    targetHexes: Hex[]
    pos: Hex
    movementStatus: number
    units: Unit[]
    resources: Partial<Resources>
  }

export type Unit = GameObject &
  Ownable & {
    name: string

    //Status
    morale: number
    injuries: Injury[]
    dead: boolean

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

export type Injury = {
  bodyPart: BodyPart
  severity: InjurySeverity
}

export enum BodyPart {
  Head,
  Torso,
  LeftArm,
  RightArm,
  LeftLeg,
  RightLeg,
  LeftHand,
  RightHand,
  LeftFoot,
  RightFoot,
  LeftEye,
  RightEye,
}

export enum InjurySeverity {
  Light,
  Medium,
  Extreme,
}

export type FightingUnit = Unit & {
  inDuel?: boolean
}

export type TBuildingTemplate = {
  key: string
  name: string
  texture: string
  cost: Partial<Resources>
  spotting: number
  production: Partial<Resources>
}
