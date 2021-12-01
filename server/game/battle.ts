import Hex from "../../shared/hex"
import { Battle, Group } from "../../shared/objects"

export function create(
  position: Hex,
  attacker: Group,
  defender: Group
): Battle {
  return {
    attacker: attacker,
    defender: defender,
    position: position,
    id: 0,
  }
}
