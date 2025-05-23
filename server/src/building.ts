import { Hex } from "../../shared/hex.js"
import { Building, ResourceSlot } from "../../shared/objects.js"
import { Resources } from "../../shared/resources.js"
import Buildings from "../../shared/templates/buildings.json" with { type: "json" }

export function createBuilding(
  id: number,
  owner: string,
  key: string,
  pos: Hex
): Building {
  const template = Buildings[key]
  
  // Default slots based on building type
  const defaultSlots: ResourceSlot[] = []
  
  // Create default slots based on production
  if (template.production) {
    Object.keys(template.production).forEach(resource => {
      defaultSlots.push({
        resourceType: resource as keyof Resources,
        efficiency: 1.0
      })
    })
  }
  
  // Use template slots if defined, otherwise use default slots
  const slots = template.slots || defaultSlots
  
  const building: Building = {
    owner: owner,
    position: pos,
    key: key,
    spotting: template.spotting,
    production: loadResourceObject(template.production),
    id: id,
    level: 1,
    slots: slots,
    maxLevel: template.maxLevel || 3, // Default max level is 3 if not specified
  }
  
  // Add upgrade requirements if available
  if (template.upgrades && template.upgrades[2]) {
    building.upgradeRequirements = template.upgrades[2].cost
  }
  
  return building
}

export function upgradeBuilding(building: Building): Building | null {
  const template = Buildings[building.key]
  
  // Check if building can be upgraded
  if (building.level >= building.maxLevel || !template.upgrades) {
    return null
  }
  
  const nextLevel = building.level + 1
  const upgrade = template.upgrades[nextLevel]
  
  if (!upgrade) {
    return null
  }
  
  // Apply upgrade
  building.level = nextLevel
  building.production = loadResourceObject(upgrade.production)
  building.spotting = upgrade.spotting
  building.slots = upgrade.slots
  
  // Set next upgrade requirements
  if (nextLevel < building.maxLevel && template.upgrades[nextLevel + 1]) {
    building.upgradeRequirements = template.upgrades[nextLevel + 1].cost
  } else {
    building.upgradeRequirements = undefined // No more upgrades
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
