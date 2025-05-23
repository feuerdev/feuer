import { Group } from "../../shared/objects.js"
import Rules from "../../shared/rules.json" with { type: "json" };
import { Hex } from "../../shared/hex.js"
import { Resources } from "../../shared/resources.js"

export function createGroup(
  id: number,
  owner: string,
  groupType: string,
  pos: Hex,
  resources: Partial<Resources> = {}
): Group {
  const template = Rules.units[groupType]
  
  if (!template) {
    throw new Error(`Group template not found for type: ${groupType}`)
  }
  
  const group: Group = {
    id: id,
    owner: owner,
    name: template.name || groupType,
    spotting: template.spotting || 2,
    targetHexes: [],
    pos: pos,
    movementStatus: 0,
    resources: resources,
    groupType: groupType,
    
    // Combat stats
    morale: template.morale || 100,
    attack: template.attack || 10,
    defense: template.defense || 10,
    
    // Physical stats
    strength: template.strength || 50,
    endurance: template.endurance || 50,
    
    // Resource gathering stats
    gatheringEfficiency: {
      wood: 1.0,
      stone: 1.0,
      food: 1.0,
      iron: 1.0,
      gold: 1.0
    }
  }
  
  // Apply gathering efficiency from template if available
  if (template.gathering) {
    group.gatheringEfficiency = {
      wood: template.gathering.wood || 1.0,
      stone: template.gathering.stone || 1.0,
      food: template.gathering.food || 1.0,
      iron: template.gathering.iron || 1.0,
      gold: template.gathering.gold || 1.0
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
