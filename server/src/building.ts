import { Hex } from "../../shared/hex.js"
import { Building, ResourceSlot } from "../../shared/objects.js"
import Buildings from "../../shared/templates/buildings.json" with { type: "json" }

export function createBuilding(
  id: number,
  owner: string,
  key: string,
  pos: Hex
): Building {
  const template = Buildings[key]
  
  const slots = template.slots || []
  
  const building: Building = {
    owner: owner,
    position: pos,
    key: key,
    spotting: template.spotting,
    id: id,
    level: 1,
    slots: slots,
    maxLevel: template.maxLevel || 3, // Default max level is 3 if not specified
    attack: template.attack,
    range: template.range,
    attackSpeed: template.attackSpeed,
    timeToNextAttack: 0,
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
  building.spotting = upgrade.spotting
  building.slots = upgrade.slots || building.slots
  
  // Update defensive stats if present in upgrade
  if (upgrade.attack !== undefined) {
    building.attack = upgrade.attack;
  }
  if (upgrade.range !== undefined) {
    building.range = upgrade.range;
  }
  if (upgrade.attackSpeed !== undefined) {
    building.attackSpeed = upgrade.attackSpeed;
    building.timeToNextAttack = 0; // Reset attack cooldown on upgrade
  }
  
  // Set next upgrade requirements
  if (nextLevel < building.maxLevel && template.upgrades[nextLevel + 1]) {
    building.upgradeRequirements = template.upgrades[nextLevel + 1].cost
  } else {
    building.upgradeRequirements = undefined // No more upgrades
  }
  
  return building
}
