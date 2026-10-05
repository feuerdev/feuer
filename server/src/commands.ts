import { create as resourceDefaults } from "../../shared/resources.js";
export const validId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
export const validHex = (value: any): boolean => !!value && [value.q,value.r,value.s].every(Number.isSafeInteger) && value.q + value.r + value.s === 0;
const resources = new Set(Object.keys(resourceDefaults()));
export function validCommand(command: string, data: any): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  switch(command) {
    case "Movement": return validId(data.selection) && validHex(data.target);
    case "Construction": return validHex(data.pos) && typeof data.type === "string" && /^[a-z_]{1,64}$/.test(data.type);
    case "Transfer": return validId(data.unitId) && resources.has(data.resource) && typeof data.amount === "number" && Number.isFinite(data.amount) && Math.abs(data.amount) <= Number.MAX_SAFE_INTEGER;
    case "Disband": case "UnassignUnit": return validId(data.unitId);
    case "Demolish": case "UpgradeBuilding": return validId(data.buildingId);
    case "AssignUnit": return validId(data.unitId) && validId(data.buildingId) && validId(data.slotIndex);
    case "HireUnit": return validId(data.buildingId) && data.unitType === "Unit";
    case "SetUnitBehavior": return validId(data.unitId) && Number.isInteger(data.behavior) && data.behavior >= 0 && data.behavior <= 2;
    case "Relation": return validUser(data.id1) && validUser(data.id2);
    case "ChangeRelation": return validUser(data.targetPlayerId) && Number.isInteger(data.relationType) && data.relationType >= 0 && data.relationType <= 2;
    default: return false;
  }
}
export const validUser = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 255 && !["__proto__", "constructor", "prototype"].includes(value);
