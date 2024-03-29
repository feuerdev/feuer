import { Group } from "../../shared/objects"
import Hex from "../../shared/hex"
import * as Rules from "../../shared/rules.json"
import { generateUnit } from "./unit"
import { create } from "../../shared/resources"

export function createGroup(
  id: number,
  owner: string,
  name: string,
  pos: Hex
): Group {
  const template = Rules.units[name]
  const group: Group = {
    owner: owner,
    spotting: 0,
    targetHexes: [],
    pos: pos,
    movementStatus: 0,
    units: [],
    resources: create(),
    id: id,
  }
  group.pos = pos
  group.spotting = template.spotting
  group.units.push(generateUnit(owner))
  return group
}
