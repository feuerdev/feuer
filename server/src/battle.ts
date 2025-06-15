import { Hex } from "../../shared/hex.js";
import { Battle, Unit } from "../../shared/objects.js";

export function create(
  id: number,
  position: Hex,
  attacker: Unit,
  defender: Unit
): Battle {
  return {
    attacker: attacker,
    defender: defender,
    position: position,
    id: id,
  };
}
