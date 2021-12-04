import { Group } from "../../shared/objects"
import Hex from "../../shared/hex"
import * as Rules from "../../shared/rules.json"
import { generateUnit } from "./unit"
import GameServer from "./gameserver"

export function createGroup(owner: string, name: string, pos: Hex): Group {
  const template = Rules.units[name]
  const group: Group = {
    owner: owner,
    spotting: 0,
    targetHexes: [],
    pos: pos,
    speed: 0,
    attack: 0,
    hp: 0,
    movementStatus: 0,
    units: [],
    resources: undefined,
    id: GameServer.idCounter++,
  }
  group.pos = pos
  group.spotting = template.spotting
  group.speed = template.speed
  group.attack = template.attack
  group.hp = template.hp
  group.units.push(generateUnit(owner))
  return group
}
