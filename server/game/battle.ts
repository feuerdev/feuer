import Hex from "../../shared/hex"
import { Battle, Group } from "../../shared/objects"
import GameServer from "./gameserver"

export function create(
  position: Hex,
  attacker: Group,
  defender: Group
): Battle {
  return {
    attacker: attacker,
    defender: defender,
    position: position,
    id: GameServer.idCounter++,
  }
}
