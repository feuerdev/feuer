export default abstract class GameObject {
  public owner:string;
  public id:number;
  private static idcount:number = 1;

  constructor(owner) {
    this.owner = owner;
    this.id = GameObject.idcount++;
  }
}

/**
 * Entities implementing this Interface are able to spot surrounding hexes
 */
export interface Spotter {
  /**
   * Returns the number of hexes that Entity can see
   */
  getSpottingRange():number;
}