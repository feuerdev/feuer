import { Group } from "../../shared/objects.js"
import Rules from "../../shared/rules.json" with { type: "json" };
import { generateUnit } from "./unit.js"
import { Hex } from "../../shared/hex.js"
import { Resources } from "../../shared/resources.js"

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
    gatheringEfficiency: {
      wood: 1.0,
      stone: 1.0,
      food: 1.0,
      iron: 1.0,
      gold: 1.0
    }
  }
  
  group.pos = pos
  group.spotting = template.spotting
  
  // Create initial unit
  const unit = generateUnit(owner)
  group.units.push(unit)
  
  // Apply gathering efficiency from template if available
  if (template.gathering) {
    group.gatheringEfficiency = {
      wood: template.gathering.wood || 1.0,
      stone: template.gathering.stone || 1.0,
      food: template.gathering.food || 1.0,
      iron: template.gathering.iron || 1.0,
      gold: template.gathering.gold || 1.0
    }
  } else {
    // Adjust gathering efficiency based on unit stats if no template gathering values
    // Higher strength improves wood and stone gathering
    // Higher endurance improves all gathering types slightly
    if (unit.strength > 50) {
      group.gatheringEfficiency.wood += (unit.strength - 50) / 100
      group.gatheringEfficiency.stone += (unit.strength - 50) / 100
    }
    
    if (unit.endurance > 50) {
      Object.keys(group.gatheringEfficiency).forEach(key => {
        group.gatheringEfficiency[key] += (unit.endurance - 50) / 200
      })
    }
  }
  
  return group
}

/**
 * Assigns a group to a building slot
 * @param group The group to assign
 * @param buildingId The building ID to assign to
 * @param slotIndex The slot index in the building
 */
export function assignGroupToBuilding(
  group: Group,
  buildingId: number,
  slotIndex: number
): void {
  // Remove from previous assignment if any
  if (group.assignedToBuilding !== undefined) {
    group.assignedToBuilding = undefined
    group.assignedToSlot = undefined
  }
  
  // Assign to new building and slot
  group.assignedToBuilding = buildingId
  group.assignedToSlot = slotIndex
}

/**
 * Unassigns a group from its current building
 * @param group The group to unassign
 */
export function unassignGroupFromBuilding(group: Group): void {
  group.assignedToBuilding = undefined
  group.assignedToSlot = undefined
}
