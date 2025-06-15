import { Unit } from "../../shared/objects.js";
import { Hex } from "../../shared/hex.js";
import { Resources } from "../../shared/resources.js";
import { UnitBehavior } from "../../shared/objects.js";

/**
 * Generates a random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Creates a new unit with random attributes
 */
export function createUnit(
  id: number,
  owner: string,
  pos: Hex,
  resources: Partial<Resources> = {}
): Unit {
  // Generate random attributes
  const strength = randomBetween(40, 80);
  const endurance = randomBetween(40, 80);

  // Default unit properties
  const unit: Unit = {
    id: id,
    owner: owner,
    name: `Unit ${id}`,
    spotting: 5,
    targetHexes: [],
    pos: pos,
    movementStatus: 0,
    resources: resources,

    // Combat stats with randomization
    morale: randomBetween(80, 100),
    initiative: randomBetween(1, 10),
    agility: randomBetween(1, 10),
    painThreshold: randomBetween(1, 10),
    intelligence: randomBetween(1, 10),

    // Physical stats
    strength: strength,
    endurance: endurance,

    // Behavior
    behavior: UnitBehavior.Neutral,

    // Resource gathering stats with some randomization
    gatheringEfficiency: {
      wood: 1.0 + (strength - 60) / 100,
      stone: 1.0 + (strength - 60) / 100,
      food: 1.0 + (endurance - 60) / 100,
      iron: 1.0 + randomBetween(-20, 20) / 100,
      gold: 1.0 + randomBetween(-20, 20) / 100,
    },
  };

  return unit;
}

/**
 * Assigns a unit to a building slot
 * @param unit The unit to assign
 * @param buildingId The building ID to assign to
 * @param slotIndex The slot index in the building
 */
export function assignUnitToBuilding(
  unit: Unit,
  buildingId: number,
  slotIndex: number
): void {
  // Remove from previous assignment if any
  if (unit.assignedToBuilding !== undefined) {
    unit.assignedToBuilding = undefined;
    unit.assignedToSlot = undefined;
  }

  // Assign to new building and slot
  unit.assignedToBuilding = buildingId;
  unit.assignedToSlot = slotIndex;
}

/**
 * Unassigns a unit from its current building
 * @param unit The unit to unassign
 */
export function unassignUnitFromBuilding(unit: Unit): void {
  unit.assignedToBuilding = undefined;
  unit.assignedToSlot = undefined;
}
