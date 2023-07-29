import { Group } from "../../shared/objects"
import Hex from "../../shared/hex"
import * as Rules from "../../shared/rules.json"
import { generateUnit } from "./unit"
import Resources from "../../shared/resources"

export function createGroup(
  id: number,
  owner: string,
  name: string,
  pos: Hex,
  resources: Partial<Resources> = {}
): Group {
  const template = Rules.units[name]
  const group: Group = {
    owner: owner,
    spotting: 0,
    targetHexes: [],
    pos: pos,
    movementStatus: 0,
    units: [],
    resources: resources,
    id: id,
  }
  group.pos = pos
  group.spotting = template.spotting
  group.units.push(generateUnit(owner))
  return group
}
