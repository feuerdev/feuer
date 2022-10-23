import Hex from "../../shared/hex"

export default class Player {
  public initialized: boolean = false
  public uid: string

  public discoveredHexes: Hex[] = []
  public visibleHexes: Hex[] = []
}
