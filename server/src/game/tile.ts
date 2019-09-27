import Hex from "../../../shared/hex";
import { Environment } from "../../../shared/gamedata";

/**
 * Tile-Class representing one hex with all its relevant fields
 * Don't put too much functionality in here. The instances of this object will get sent to the clients
 */
export default class Tile {

  private hex:Hex;
  public height:number;
  public forestation:number;
  public rockyness:number;

  public environmentSpot1:Environment;
  public environmentSpot2:Environment;
  public environmentSpot3:Environment;

  constructor(q:number, r:number) {
    this.hex = new Hex(q, r, -q-r);
  }
}