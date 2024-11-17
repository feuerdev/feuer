import { Hex } from "./hex.js"

export type Player = {
  initialized: boolean
  uid: string
  discoveredHexes: Hex[]
  visibleHexes: Hex[]
}
