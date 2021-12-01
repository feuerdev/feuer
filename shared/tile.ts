import Hex from "./hex"
import Resources from "./resources"

/**
 * Tile-Class representing one hex with all its relevant fields
 */
export default interface Tile {
  hex: Hex
  height: number
  forestation: number
  rockyness: number
  ironOre: number
  goldOre: number
  resources: Resources
}
