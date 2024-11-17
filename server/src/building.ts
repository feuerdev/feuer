import { Hex } from "../../shared/hex.js"
import { Building } from "../../shared/objects.js"
import { Resources } from "../../shared/resources.js"
import Buildings from "../../shared/templates/buildings.json"

export function createBuilding(
  id: number,
  owner: string,
  key: string,
  pos: Hex
): Building {
  const template = Buildings[key]
  const building: Building = {
    owner: owner,
    position: pos,
    key: key,
    spotting: template.spotting,
    production: loadResourceObject(template.production),
    id: id,
  }
  return building
}

//TODO: handle can't upgrade
// export function upgradeBuilding(building: Building): Building {
//   let template = Buildings[building.type]
//   if (template.levels.length >= building.level + 1) {
//     let newTemplate = Buildings[building.type].levels[building.level]
//     return {
//       owner: building.owner,
//       position: building.position,
//       type: building.type,
//       level: building.level++,
//       spotting: newTemplate.spotting,
//       hp: newTemplate.hp,
//       production: loadResourceObject(newTemplate.production),
//       id: building.id,
//     }
//   }
//   return building
// }

function loadResourceObject(template): Resources {
  let result = {}
  for (let res of Object.keys(template)) {
    result[res] = template[res]
  }
  return result as Resources
}
