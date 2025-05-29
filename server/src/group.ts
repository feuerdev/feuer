import { Group } from "../../shared/objects.js";
import { Hex } from "../../shared/hex.js";
import { Resources } from "../../shared/resources.js";

/**
 * Generates a random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Creates a new group with random attributes
 */
export function createGroup(
  id: number,
  owner: string,
  groupType: string,
  pos: Hex,
  resources: Partial<Resources> = {}
): Group {
  // Generate random attributes
  const strength = randomBetween(40, 80);
  const endurance = randomBetween(40, 80);

  // Default group properties
  const group: Group = {
    id: id,
    owner: owner,
    name: `Group ${id}`,
    spotting: 1,
    targetHexes: [],
    pos: pos,
    movementStatus: 0,
    resources: resources,
    groupType: "Group",

    // Combat stats with randomization
    morale: randomBetween(80, 100),
    attack: randomBetween(5, 15),
    defense: randomBetween(5, 15),

    // Physical stats
    strength: strength,
    endurance: endurance,

    // Resource gathering stats with some randomization
    gatheringEfficiency: {
      wood: 1.0 + (strength - 60) / 100,
      stone: 1.0 + (strength - 60) / 100,
      food: 1.0 + (endurance - 60) / 100,
      iron: 1.0 + randomBetween(-20, 20) / 100,
      gold: 1.0 + randomBetween(-20, 20) / 100,
    },
  };

  return group;
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
    group.assignedToBuilding = undefined;
    group.assignedToSlot = undefined;
  }

  // Assign to new building and slot
  group.assignedToBuilding = buildingId;
  group.assignedToSlot = slotIndex;
}

/**
 * Unassigns a group from its current building
 * @param group The group to unassign
 */
export function unassignGroupFromBuilding(group: Group): void {
  group.assignedToBuilding = undefined;
  group.assignedToSlot = undefined;
}
