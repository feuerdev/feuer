import { Unit } from "../../shared/objects.js";
import { getNextId } from "./main.js";

/**
 * Generates a random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function generateUnit(owner: string): Unit {
  let unit: Unit = {
    owner: owner,
    name: generateUnitName(),
    morale: randomBetween(80, 100),
    injuries: [],
    dead: false,
    leadership: randomBetween(30, 70),
    courage: randomBetween(30, 70),
    tactics: randomBetween(30, 70),
    teacher: randomBetween(30, 70),
    agressiveness: randomBetween(30, 70),
    height: randomBetween(160, 190), // cm
    weight: randomBetween(60, 100), // kg
    sword: randomBetween(30, 60),
    spear: randomBetween(30, 60),
    bow: randomBetween(30, 60),
    dodging: randomBetween(30, 60),
    strength: randomBetween(40, 60),
    endurance: randomBetween(40, 60),
    experience_theory: randomBetween(10, 30),
    experience_combat: randomBetween(0, 20),
    id: getNextId(),
  };

  return unit;
}

/**
 * Generates a random unit name
 */
function generateUnitName(): string {
  const firstNames = [
    "Alaric",
    "Bjorn",
    "Cedric",
    "Dagmar",
    "Einar",
    "Freya",
    "Gunnar",
    "Helga",
    "Ivar",
    "Jorund",
    "Knut",
    "Leif",
    "Magnus",
    "Nils",
    "Olaf",
    "Ragnar",
    "Sigrid",
    "Thora",
    "Ulf",
    "Viggo",
  ];

  const lastNames = [
    "Ironhand",
    "Stormborn",
    "Shieldbreaker",
    "Wolfsbane",
    "Oakenheart",
    "Fjordwalker",
    "Bearslayer",
    "Frostbeard",
    "Thunderaxe",
    "Swiftfoot",
    "Stonefist",
    "Bloodedge",
    "Skysinger",
    "Flamehair",
    "Icegaze",
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}
