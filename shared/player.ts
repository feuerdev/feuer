import { Hex } from "./hex.js"

export class Player {
  public initialized: boolean = false
  public uid: string
  public discoveredHexes: Hex[] = []
  public visibleHexes: Hex[] = []
}
