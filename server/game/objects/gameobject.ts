export default abstract class GameObject {
  public owner: string
  public id: number
  private static idcount: number = 1 //make entity ids start with 1 to be able to differentiate with 0 ids

  constructor(owner) {
    this.owner = owner
    this.id = GameObject.idcount++
  }
}

/**
 * Entities implementing this Interface are able to spot surrounding hexes
 */
export interface Spotter {
  /**
   * Returns the number of hexes that Entity can see
   */
  getSpottingRange(): number
}

/**
 * Entities that can be drawn
 */
export interface Drawable {
  /**
   * Returns the Texture
   */
  getTexture(): string
}
