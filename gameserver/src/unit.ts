import { Unit } from "../../shared/objects"
import { getNextId } from "./main"

export function generateUnit(owner: string): Unit {
  let unit: Unit = {
    owner: owner,
    name: "",
    leadership: 0,
    courage: 0,
    tactics: 0,
    teacher: 0,
    agressiveness: 0,
    height: 0,
    weight: 0,
    sword: 0,
    spear: 0,
    bow: 0,
    dodging: 0,
    strength: 0,
    endurance: 0,
    experience_theory: 0,
    experience_combat: 0,
    id: getNextId(),
  }
  //TODO: Randomly generate stats here
  return unit
}
