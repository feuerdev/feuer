import Hex from "../../shared/hex"
import * as Rules from "../../shared/rules.json"
import { Building } from "../../shared/objects"
import Resources from "../../shared/resources"
import GameServer from "./gameserver"

export function createBuilding(
  owner: string,
  name: string,
  pos: Hex
): Building {
  const template = Rules.buildings[name].levels[0]
  const building: Building = {
    owner: owner,
    position: pos,
    type: name,
    level: 0,
    spotting: template.spotting,
    hp: template.hp,
    resourceGeneration: loadResourceObject(template.resource_generation),
    id: GameServer.idCounter++,
  }
  return building
}
//TODO: handle can't upgrade
export function upgradeBuilding(building: Building): Building {
  let template = Rules.buildings[building.type]
  if (template.levels.length >= building.level + 1) {
    let newTemplate = Rules.buildings[building.type].levels[building.level]
    return {
      owner: building.owner,
      position: building.position,
      type: building.type,
      level: building.level++,
      spotting: newTemplate.spotting,
      hp: newTemplate.hp,
      resourceGeneration: loadResourceObject(newTemplate.resource_generation),
      id: building.id,
    }
  }
  return building
}

function loadResourceObject(template): Resources {
  let result = {}
  for (let res of Object.keys(template)) {
    result[res] = template[res]
  }
  return result as Resources
}
