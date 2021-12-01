import { Group } from "../../shared/objects"
import Hex from "../../shared/hex"
import * as Rules from "../../shared/rules.json"
import { generateUnit } from "./unit"

export function createGroup(owner: string, name: string, pos: Hex): Group {
  const template = Rules.units[name]
  const group: Group = {
    owner: "",
    spotting: 0,
    targetHexes: [],
    pos: undefined,
    speed: 0,
    attack: 0,
    hp: 0,
    movementStatus: 0,
    units: [],
    resources: undefined,
    id: 0,
  }
  group.pos = pos
  group.spotting = template.spottingDistance
  group.speed = template.speed
  group.attack = template.attack
  group.hp = template.hp
  group.units.push(generateUnit(owner))
  return group
}
