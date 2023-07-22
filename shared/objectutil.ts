import { Hashtable } from "./util"
import { Biome, BodyPart, FightingUnit, Group, Injury, InjurySeverity, Tile } from "./objects"
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

export type AttackResult = {
  injuries: Injury[]
  morale: number
}

export function isDead(unit: FightingUnit): boolean {
  return unit.dead
}

export function hasFled(unit: FightingUnit): boolean {
  return unit.morale <= 0
}

export function applyAttackResult(unit: FightingUnit, result: AttackResult): FightingUnit {
  for (const injury of result.injuries) {
    unit.injuries.push(injury)
    unit.morale -= result.morale
  }
  return unit
}

export function calculateAttack(_attacker: FightingUnit, _defender: FightingUnit): AttackResult {
  if(Math.random() < 0.5) {
    return {
      injuries: [],
      morale: 0,
    }
  }

  // get a random bodypart
  const bodypart = BodyPart[Math.floor(Math.random() * Object.keys(BodyPart).length / 2)]

  // get a random severity
  const severity = InjurySeverity[Math.floor(Math.random() * Object.keys(InjurySeverity).length / 2)]

  return {
    injuries: [{
      bodyPart: BodyPart[bodypart],
      severity: InjurySeverity[severity],
    }],
    morale: 50,
  }
}

export function calculateMorale(group: Group): number {
  let morale = 0
  for (const unit of group.units) {
    morale += (unit as FightingUnit).morale
  }
  return morale / group.units.length
}

export function calculateInitiative(unit: FightingUnit): number {
  return unit.agressiveness + Math.round(Math.random() * 10)
}

export function canFight(group: Group): boolean {
  const morale = this.calculateMorale(group)
  // check if group has at least one unit that is not dead
  group.units.filter((unit) => {
    return unit.dead === false
  })
    
  return morale > 0
}

export enum TransferDirection {
  tile,
  group,
}
