import { Hex } from "../../shared/hex.js";
import { Battle, Group } from "../../shared/objects.js";

export function create(
  id: number,
  position: Hex,
  attacker: Group,
  defender: Group
): Battle {
  return {
    attacker: attacker,
    defender: defender,
    position: position,
    id: id,
  };
}
